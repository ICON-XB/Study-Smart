// IndexedDB storage for scanned document images.
//
// Images are encrypted with the same PIN-derived AES-GCM key as the rest of
// the app's data (see security.js) before they are written, so a copied
// browser profile does not expose readable scans. Older unencrypted entries
// are still readable and are re-encrypted the next time they are saved.
const DB_NAME = 'StudySmartVisionDB';
const DB_VERSION = 1;
const MAX_STORED_IMAGES = 200;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const _tx = async (mode, fn) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', mode);
    const store = tx.objectStore('images');
    let result;
    const req = fn(store);
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = (e) => { db.close(); reject(e.target.error); };
    tx.onabort = (e) => { db.close(); reject(e.target.error); };
  });
};

const storeImage = async (id, base64Data) => {
  if (typeof Security === 'undefined' || !Security.canEncrypt()) {
    throw new Error('App is locked; cannot store the image.');
  }
  const cipher = await Security.encryptText(base64Data);
  await _tx('readwrite', (store) => store.put({ id, enc: cipher, savedAt: Date.now() }));
  await pruneImages();
  return id;
};

const getImage = async (id) => {
  const record = await _tx('readonly', (store) => store.get(id));
  if (!record) return null;
  if (record.enc) {
    try {
      return await Security.decryptText(record.enc);
    } catch {
      return null; // encrypted with a different PIN key, or damaged
    }
  }
  return record.data || null; // legacy unencrypted entry
};

const deleteImage = async (id) => {
  await _tx('readwrite', (store) => store.delete(id));
};

const listImageIds = async () => {
  return (await _tx('readonly', (store) => store.getAllKeys())) || [];
};

/** Re-encrypts every stored image with the current key (after a PIN change). */
const reencryptAllImages = async (decryptOld) => {
  const records = (await _tx('readonly', (store) => store.getAll())) || [];
  for (const record of records) {
    let plain = null;
    try {
      plain = record.enc ? await decryptOld(record.enc) : record.data;
    } catch {
      plain = null;
    }
    if (plain) {
      const cipher = await Security.encryptText(plain);
      await _tx('readwrite', (store) => store.put({ id: record.id, enc: cipher, savedAt: record.savedAt || Date.now() }));
    }
  }
};

/** Keeps storage bounded: removes the oldest images beyond the limit. */
const pruneImages = async () => {
  const records = (await _tx('readonly', (store) => store.getAll())) || [];
  if (records.length <= MAX_STORED_IMAGES) return;
  records.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
  for (const record of records.slice(0, records.length - MAX_STORED_IMAGES)) {
    await deleteImage(record.id);
  }
};

/** Deletes the whole image database (used by "Erase all data"). */
const deleteAllImages = () => {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
};
