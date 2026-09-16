// IndexedDB Wrapper for large document images
const DB_NAME = 'StudySmartVisionDB';
const DB_VERSION = 1;

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

const storeImage = async (id, base64Data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    store.put({ id, data: base64Data });
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
};

const getImage = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = (e) => reject(e.target.error);
  });
};
