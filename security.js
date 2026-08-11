/**
 * ============================================================
 * STUDYSMART SECURITY MODULE — security.js
 * ============================================================
 * Implements defence-in-depth security for the StudySmart PWA:
 *  1. PBKDF2-SHA-256 PIN hashing (100,000 iterations)
 *  2. AES-GCM 256-bit encryption of all localStorage data
 *  3. Brute-force lockout with exponential back-off
 *  4. Session auto-lock on inactivity & visibility change
 *  5. Input sanitization & XSS prevention utilities
 *  6. Encrypted backup export / import
 *
 * All crypto operations use the browser's built-in Web Crypto API.
 * No third-party dependencies. Works fully offline.
 * ============================================================
 */

'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const SEC = {
  // Storage keys (the values stored here are always encrypted or hashed)
  PIN_HASH_KEY:       'ss_pin_hash',
  PIN_SALT_KEY:       'ss_pin_salt',
  LOCKOUT_KEY:        'ss_lockout',
  SETUP_DONE_KEY:     'ss_setup_done',
  DATA_PREFIX:        'ss_enc_',          // encrypted data keys start with this

  // Security thresholds
  WARN_ATTEMPTS:       3,   // show warning after this many failures
  MAX_ATTEMPTS:       10,   // wipe data after this many failures
  BASE_LOCKOUT_MS:  30000,  // 30-second initial lockout
  MAX_LOCKOUT_MS:  900000,  // 15-minute maximum lockout
  INACTIVITY_MS:   300000,  // 5 minutes of inactivity triggers auto-lock

  // Crypto parameters
  PBKDF2_ITERATIONS: 100000,
  PBKDF2_HASH:       'SHA-256',
  SALT_BYTES:         16,
  IV_BYTES:           12,
  AES_KEY_BITS:      256,
  AES_MODE:          'AES-GCM',
};

// ============================================================
// SECURITY MANAGER CLASS
// ============================================================
class SecurityManager {
  constructor() {
    this._cryptoKey    = null;   // in-memory AES-GCM key (lost on lock)
    this._isLocked     = true;
    this._isSetup      = false;
    this._inactivityId = null;
    this._lockoutData  = { attempts: 0, lockedUntil: 0 };

    this._loadLockoutState();
  }

  // ----------------------------------------------------------
  // INITIALISE — call on app start
  // ----------------------------------------------------------
  async init() {
    this._isSetup = localStorage.getItem(SEC.SETUP_DONE_KEY) === 'true';

    if (!this._isSetup) {
      this._showSetupModal();
    } else {
      this._showLockScreen();
    }

    // Auto-lock on tab hide / window blur
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.lock('Tab hidden');
    });
    window.addEventListener('blur', () => {
      // Small delay so modal popups (e.g. file picker) don't trigger lock
      setTimeout(() => {
        if (!document.hasFocus()) this.lock('Window lost focus');
      }, 1500);
    });
  }

  // ----------------------------------------------------------
  // PIN SETUP
  // ----------------------------------------------------------
  async setupPIN(pin) {
    if (!this._validatePINFormat(pin)) {
      throw new Error('PIN must be 4–8 digits (numbers only).');
    }

    const salt    = crypto.getRandomValues(new Uint8Array(SEC.SALT_BYTES));
    const hash    = await this._hashPIN(pin, salt);
    const key     = await this._deriveCryptoKey(pin, salt);

    // Store hash and salt (not the PIN itself)
    localStorage.setItem(SEC.PIN_HASH_KEY, this._bufToHex(hash));
    localStorage.setItem(SEC.PIN_SALT_KEY, this._bufToHex(salt));
    localStorage.setItem(SEC.SETUP_DONE_KEY, 'true');

    this._cryptoKey  = key;
    this._isSetup    = true;
    this._isLocked   = false;
    this._lockoutData = { attempts: 0, lockedUntil: 0 };

    this._startInactivityTimer();
    this._hideLockScreen();
  }

  // ----------------------------------------------------------
  // PIN VERIFICATION (UNLOCK)
  // ----------------------------------------------------------
  async verifyPIN(pin) {
    // Check lockout first
    const lockoutMs = this._getLockoutRemainingMs();
    if (lockoutMs > 0) {
      const secs = Math.ceil(lockoutMs / 1000);
      throw new Error(`Too many failed attempts. Try again in ${secs}s.`);
    }

    const storedHash = this._hexToBuf(localStorage.getItem(SEC.PIN_HASH_KEY));
    const salt       = this._hexToBuf(localStorage.getItem(SEC.PIN_SALT_KEY));

    const attemptHash = await this._hashPIN(pin, salt);
    const match = this._constantTimeEqual(storedHash, attemptHash);

    if (!match) {
      this._recordFailedAttempt();

      const remaining = SEC.MAX_ATTEMPTS - this._lockoutData.attempts;
      if (this._lockoutData.attempts >= SEC.MAX_ATTEMPTS) {
        this._wipeAllData();
        throw new Error('WIPE: Maximum failed attempts reached. All data has been erased for security.');
      }

      const nextLockout = this._getLockoutRemainingMs();
      if (nextLockout > 0) {
        throw new Error(`Wrong PIN. Locked for ${Math.ceil(nextLockout / 1000)}s. (${remaining} attempts left before data wipe)`);
      }

      throw new Error(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} left before data wipe.`);
    }

    // Success — derive the crypto key and unlock
    this._cryptoKey = await this._deriveCryptoKey(pin, salt);
    this._lockoutData = { attempts: 0, lockedUntil: 0 };
    this._saveLockoutState();

    this._isLocked = false;
    this._startInactivityTimer();
    this._hideLockScreen();

    return true;
  }

  // ----------------------------------------------------------
  // LOCK
  // ----------------------------------------------------------
  lock(reason = '') {
    if (this._isLocked) return;

    // Destroy the key from memory
    this._cryptoKey = null;
    this._isLocked  = true;

    this._stopInactivityTimer();
    this._showLockScreen(reason);

    console.info('[Security] Session locked.', reason ? `Reason: ${reason}` : '');
  }

  // ----------------------------------------------------------
  // CHANGE PIN
  // ----------------------------------------------------------
  async changePIN(currentPIN, newPIN) {
    await this.verifyPIN(currentPIN); // throws if wrong

    // Re-encrypt all existing data with new key
    const oldKey   = this._cryptoKey;
    const salt     = crypto.getRandomValues(new Uint8Array(SEC.SALT_BYTES));
    const newHash  = await this._hashPIN(newPIN, salt);
    const newKey   = await this._deriveCryptoKey(newPIN, salt);

    // Decrypt all stored encrypted keys with old key, re-encrypt with new key
    const keysToMigrate = Object.keys(localStorage).filter(k => k.startsWith(SEC.DATA_PREFIX));

    for (const storageKey of keysToMigrate) {
      const raw      = localStorage.getItem(storageKey);
      if (!raw) continue;
      const decrypted = await this._decryptWithKey(raw, oldKey);
      const reencrypted = await this._encryptWithKey(decrypted, newKey);
      localStorage.setItem(storageKey, reencrypted);
    }

    // Update PIN hash and salt
    localStorage.setItem(SEC.PIN_HASH_KEY, this._bufToHex(newHash));
    localStorage.setItem(SEC.PIN_SALT_KEY, this._bufToHex(salt));

    this._cryptoKey = newKey;
  }

  // ----------------------------------------------------------
  // ENCRYPTED READ / WRITE (Replace raw localStorage)
  // ----------------------------------------------------------
  async writeSecure(logicalKey, value) {
    if (this._isLocked || !this._cryptoKey) {
      throw new Error('[Security] Cannot write — session is locked.');
    }
    const storageKey  = SEC.DATA_PREFIX + logicalKey;
    const plaintext   = typeof value === 'string' ? value : JSON.stringify(value);
    const ciphertext  = await this._encrypt(plaintext);
    localStorage.setItem(storageKey, ciphertext);
  }

  async readSecure(logicalKey, fallback = null) {
    if (this._isLocked || !this._cryptoKey) return fallback;
    const storageKey = SEC.DATA_PREFIX + logicalKey;
    const raw        = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    try {
      const plaintext = await this._decrypt(raw);
      try { return JSON.parse(plaintext); } catch { return plaintext; }
    } catch (e) {
      console.error('[Security] Decryption failed for key:', logicalKey, e.message);
      return fallback;
    }
  }

  removeSecure(logicalKey) {
    localStorage.removeItem(SEC.DATA_PREFIX + logicalKey);
  }

  // ----------------------------------------------------------
  // ENCRYPTED BACKUP EXPORT
  // ----------------------------------------------------------
  async exportEncrypted(data, exportPassword = null) {
    const plaintext = JSON.stringify(data, null, 2);

    if (exportPassword && exportPassword.trim().length >= 4) {
      // Encrypt with a password-derived key
      const salt     = crypto.getRandomValues(new Uint8Array(SEC.SALT_BYTES));
      const key      = await this._deriveKeyFromPassword(exportPassword, salt);
      const iv       = crypto.getRandomValues(new Uint8Array(SEC.IV_BYTES));
      const encoded  = new TextEncoder().encode(plaintext);
      const cipher   = await crypto.subtle.encrypt({ name: SEC.AES_MODE, iv }, key, encoded);

      const payload = {
        encrypted: true,
        version:   '1',
        salt:      this._bufToHex(salt),
        iv:        this._bufToHex(iv),
        data:      this._bufToHex(new Uint8Array(cipher))
      };
      return JSON.stringify(payload);
    } else {
      // Unencrypted — clearly labelled
      return JSON.stringify({ encrypted: false, version: '1', data });
    }
  }

  async importEncrypted(rawJson, exportPassword = null) {
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Invalid backup file — could not parse JSON.');
    }

    if (!parsed.version || !('encrypted' in parsed)) {
      throw new Error('Invalid backup file — missing version or encryption flag.');
    }

    if (parsed.encrypted) {
      if (!exportPassword) {
        throw new Error('This backup is password-protected. Enter the export password.');
      }
      const salt    = this._hexToBuf(parsed.salt);
      const iv      = this._hexToBuf(parsed.iv);
      const cipher  = this._hexToBuf(parsed.data);
      const key     = await this._deriveKeyFromPassword(exportPassword, salt);

      let plain;
      try {
        const decrypted = await crypto.subtle.decrypt({ name: SEC.AES_MODE, iv }, key, cipher);
        plain = new TextDecoder().decode(decrypted);
      } catch {
        throw new Error('Wrong export password or corrupted backup file.');
      }
      return JSON.parse(plain);
    } else {
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Invalid backup structure — missing data field.');
      }
      return parsed.data;
    }
  }

  // ----------------------------------------------------------
  // INPUT SANITIZATION UTILITIES
  // ----------------------------------------------------------

  /**
   * Escape HTML special characters to prevent XSS.
   * Use for user text inserted anywhere into the DOM.
   */
  static sanitizeText(str) {
    if (typeof str !== 'string') str = String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Strip dangerous tags and event handlers from HTML strings.
   * Use when you must insert HTML (e.g. formatted content).
   */
  static sanitizeHTML(html) {
    if (typeof html !== 'string') return '';
    // Strip script, iframe, object, embed, form, link, meta tags
    html = html.replace(/<(script|iframe|object|embed|form|link|base|meta|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    html = html.replace(/<(script|iframe|object|embed|form|link|base|meta|style)[^>]*\/?>/gi, '');
    // Strip event handlers (on*)
    html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
    // Strip javascript: protocol
    html = html.replace(/javascript\s*:/gi, '');
    // Strip data: URIs (potential XSS vector)
    html = html.replace(/data\s*:\s*[^,]*,/gi, '');
    return html;
  }

  /**
   * Validate that a string is safe for use as a module code.
   * Only alphanumeric characters and hyphens allowed.
   */
  static validateModuleCode(code) {
    return /^[A-Z0-9\-]{2,12}$/i.test(code);
  }

  /**
   * Validate that a string is a safe, non-empty text label (no control chars).
   */
  static validateLabel(str, maxLen = 200) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    return trimmed.length > 0 && trimmed.length <= maxLen && !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed);
  }

  /**
   * Validate a date string in YYYY-MM-DD format.
   */
  static validateDate(dateStr) {
    if (!dateStr) return true; // empty date is optional
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
  }

  // ----------------------------------------------------------
  // INACTIVITY TIMER
  // ----------------------------------------------------------
  _startInactivityTimer() {
    this._stopInactivityTimer();
    this._resetInactivityTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    this._inactivityHandler = () => this._resetInactivityTimer();
    events.forEach(e => document.addEventListener(e, this._inactivityHandler, { passive: true }));
  }

  _resetInactivityTimer() {
    clearTimeout(this._inactivityId);
    this._inactivityId = setTimeout(() => {
      this.lock('Inactivity timeout');
    }, SEC.INACTIVITY_MS);
  }

  _stopInactivityTimer() {
    clearTimeout(this._inactivityId);
    if (this._inactivityHandler) {
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
      events.forEach(e => document.removeEventListener(e, this._inactivityHandler));
      this._inactivityHandler = null;
    }
  }

  // ----------------------------------------------------------
  // LOCKOUT STATE
  // ----------------------------------------------------------
  _recordFailedAttempt() {
    this._lockoutData.attempts++;
    const exp = Math.min(
      SEC.BASE_LOCKOUT_MS * Math.pow(2, this._lockoutData.attempts - SEC.WARN_ATTEMPTS),
      SEC.MAX_LOCKOUT_MS
    );

    if (this._lockoutData.attempts >= SEC.WARN_ATTEMPTS) {
      this._lockoutData.lockedUntil = Date.now() + exp;
    }

    this._saveLockoutState();
  }

  _getLockoutRemainingMs() {
    const remaining = this._lockoutData.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  _saveLockoutState() {
    // Stored in sessionStorage so it resets if the tab is closed
    sessionStorage.setItem(SEC.LOCKOUT_KEY, JSON.stringify(this._lockoutData));
  }

  _loadLockoutState() {
    try {
      const raw = sessionStorage.getItem(SEC.LOCKOUT_KEY);
      if (raw) this._lockoutData = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  // ----------------------------------------------------------
  // DATA WIPE (last resort after max failed attempts)
  // ----------------------------------------------------------
  _wipeAllData() {
    // Remove all encrypted study data
    const keysToRemove = Object.keys(localStorage).filter(k =>
      k.startsWith(SEC.DATA_PREFIX) || k.startsWith('studysmart_')
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    console.warn('[Security] All user data wiped due to repeated PIN failures.');
  }

  // ----------------------------------------------------------
  // LOCK SCREEN UI
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // LOCK SCREEN UI — updated to match index.html overlay IDs
  // ----------------------------------------------------------
  _showLockScreen(reason = '') {
    const overlay = document.getElementById('lock-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    // Update subtitle
    const subtitle = document.getElementById('lock-subtitle');
    if (subtitle) {
      subtitle.textContent = (reason && reason !== 'Tab hidden' && reason !== 'Window lost focus')
        ? reason
        : 'Enter your PIN to continue.';
    }

    // Clear previous PIN input
    const pinInput = document.getElementById('lock-pin');
    if (pinInput) { pinInput.value = ''; }

    // Reset pin dots
    this._updatePinDots(0);

    // Focus PIN input
    setTimeout(() => { if (pinInput) pinInput.focus(); }, 150);

    // Update lockout countdown if active
    this._updateLockoutCountdown();
  }

  _hideLockScreen() {
    const overlay = document.getElementById('lock-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';

    // Show the manual lock button in the sidebar now that app is unlocked
    const lockBtn = document.getElementById('manual-lock-btn');
    if (lockBtn) lockBtn.style.display = '';
  }

  _showSetupModal() {
    const overlay = document.getElementById('setup-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  _updateLockoutCountdown() {
    const remaining  = this._getLockoutRemainingMs();
    const badgeEl    = document.getElementById('lock-attempts-badge');
    const pinInput   = document.getElementById('lock-pin');
    const submitBtn  = document.getElementById('unlock-btn');

    if (remaining > 0) {
      if (badgeEl) {
        badgeEl.style.display = 'block';
        badgeEl.textContent   = `Locked — try again in ${Math.ceil(remaining / 1000)}s`;
      }
      if (pinInput)  pinInput.disabled  = true;
      if (submitBtn) submitBtn.disabled = true;
      setTimeout(() => this._updateLockoutCountdown(), 1000);
    } else {
      if (badgeEl)   badgeEl.style.display  = 'none';
      if (pinInput)  pinInput.disabled  = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  _updatePinDots(filledCount) {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (!dot) continue;
      dot.classList.toggle('filled', i < filledCount);
    }
  }

  _shakeCard(overlayId) {
    const card = document.querySelector(`#${overlayId} .security-card`);
    if (!card) return;
    card.classList.remove('shake');
    void card.offsetWidth; // reflow
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 550);
  }


  // ----------------------------------------------------------
  // CRYPTO PRIMITIVES (Web Crypto API)
  // ----------------------------------------------------------
  async _hashPIN(pin, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const hashBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: SEC.PBKDF2_ITERATIONS, hash: SEC.PBKDF2_HASH },
      keyMaterial,
      256
    );
    return new Uint8Array(hashBits);
  }

  async _deriveCryptoKey(pin, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: SEC.PBKDF2_ITERATIONS, hash: SEC.PBKDF2_HASH },
      keyMaterial,
      { name: SEC.AES_MODE, length: SEC.AES_KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async _deriveKeyFromPassword(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: SEC.PBKDF2_ITERATIONS, hash: SEC.PBKDF2_HASH },
      keyMaterial,
      { name: SEC.AES_MODE, length: SEC.AES_KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async _encrypt(plaintext) {
    const iv      = crypto.getRandomValues(new Uint8Array(SEC.IV_BYTES));
    const encoded = new TextEncoder().encode(plaintext);
    const cipher  = await crypto.subtle.encrypt({ name: SEC.AES_MODE, iv }, this._cryptoKey, encoded);
    // Store as iv:ciphertext (both hex-encoded)
    return this._bufToHex(iv) + ':' + this._bufToHex(new Uint8Array(cipher));
  }

  async _decrypt(stored) {
    const sepIdx  = stored.indexOf(':');
    const iv      = this._hexToBuf(stored.slice(0, sepIdx));
    const cipher  = this._hexToBuf(stored.slice(sepIdx + 1));
    const plain   = await crypto.subtle.decrypt({ name: SEC.AES_MODE, iv }, this._cryptoKey, cipher);
    return new TextDecoder().decode(plain);
  }

  async _encryptWithKey(plaintext, key) {
    const iv      = crypto.getRandomValues(new Uint8Array(SEC.IV_BYTES));
    const encoded = new TextEncoder().encode(plaintext);
    const cipher  = await crypto.subtle.encrypt({ name: SEC.AES_MODE, iv }, key, encoded);
    return this._bufToHex(iv) + ':' + this._bufToHex(new Uint8Array(cipher));
  }

  async _decryptWithKey(stored, key) {
    const sepIdx  = stored.indexOf(':');
    const iv      = this._hexToBuf(stored.slice(0, sepIdx));
    const cipher  = this._hexToBuf(stored.slice(sepIdx + 1));
    const plain   = await crypto.subtle.decrypt({ name: SEC.AES_MODE, iv }, key, cipher);
    return new TextDecoder().decode(plain);
  }

  // ----------------------------------------------------------
  // UTILITY HELPERS
  // ----------------------------------------------------------
  _bufToHex(buf) {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _hexToBuf(hex) {
    const arr = [];
    for (let i = 0; i < hex.length; i += 2) arr.push(parseInt(hex.substr(i, 2), 16));
    return new Uint8Array(arr);
  }

  /** Constant-time comparison to prevent timing attacks */
  _constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  _validatePINFormat(pin) {
    return typeof pin === 'string' && /^\d{4,8}$/.test(pin);
  }

  get isLocked()  { return this._isLocked; }
  get isSetup()   { return this._isSetup; }
}

// ============================================================
// GLOBAL INSTANCE — shared across the app
// ============================================================
const Security = new SecurityManager();

// ============================================================
// SECURE STORAGE WRAPPERS
// Replaces direct localStorage calls in app.js
// ============================================================
const SecureStore = {
  async save(key, value) {
    await Security.writeSecure(key, value);
  },
  async load(key, fallback = null) {
    return await Security.readSecure(key, fallback);
  },
  remove(key) {
    Security.removeSecure(key);
  }
};

// ============================================================
// DOM WIRING — Lock Screen & Setup (uses IDs from index.html)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await Security.init();
  _wireLockScreenEvents();
  _wireSetupModalEvents();
  _wireSecuritySettingsEvents();
});

function _wireLockScreenEvents() {
  const pinInput   = document.getElementById('lock-pin');
  const submitBtn  = document.getElementById('unlock-btn');
  const errEl      = document.getElementById('lock-error');
  const attemptsEl = document.getElementById('lock-attempts-badge');

  if (!pinInput || !submitBtn) return;

  // Live PIN dot fill as the user types
  pinInput.addEventListener('input', () => {
    const len = Math.min((pinInput.value || '').length, 4);
    Security._updatePinDots(len);
    if (errEl) errEl.textContent = '';
  });

  // Submit on Enter
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _attemptUnlock();
  });

  submitBtn.addEventListener('click', _attemptUnlock);

  async function _attemptUnlock() {
    const pin = (pinInput.value || '').trim();
    pinInput.value = '';
    Security._updatePinDots(0);

    if (!pin) {
      _showLockError('Please enter your PIN.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      await Security.verifyPIN(pin);

      // Signal app.js that the session is now unlocked
      if (typeof onAppUnlocked === 'function') onAppUnlocked();

    } catch (err) {
      const msg = err.message || 'Incorrect PIN.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock';

      if (msg.startsWith('WIPE:')) {
        if (errEl) errEl.textContent = '⚠️ All data erased after too many failed attempts. Refresh to start over.';
        submitBtn.disabled = true;
        pinInput.disabled  = true;
        return;
      }

      _showLockError(msg);
      Security._shakeCard('lock-overlay');

      // Show attempts badge
      const remaining = Security._lockoutData
        ? Math.max(0, SEC.MAX_ATTEMPTS - Security._lockoutData.attempts)
        : SEC.MAX_ATTEMPTS;

      if (attemptsEl && remaining < SEC.MAX_ATTEMPTS) {
        attemptsEl.textContent = `${remaining} attempt${remaining !== 1 ? 's' : ''} left before data wipe`;
        attemptsEl.style.display = 'block';
      }

      // Refresh lockout timer
      Security._updateLockoutCountdown();
    }
  }

  function _showLockError(msg) {
    if (!errEl) return;
    errEl.textContent = SecurityManager.sanitizeText(msg);
  }
}

function _wireSetupModalEvents() {
  const pinNew     = document.getElementById('setup-pin');
  const pinConfirm = document.getElementById('setup-pin-confirm');
  const submitBtn  = document.getElementById('setup-confirm-btn');
  const errEl      = document.getElementById('setup-error');
  const overlay    = document.getElementById('setup-overlay');

  if (!submitBtn || !overlay) return;

  submitBtn.addEventListener('click', async () => {
    const pin1 = (pinNew?.value     || '').trim();
    const pin2 = (pinConfirm?.value || '').trim();

    if (!pin1 || pin1.length < 4) {
      _showSetupError('PIN must be at least 4 digits.'); return;
    }
    if (!/^\d+$/.test(pin1)) {
      _showSetupError('PIN must contain numbers only.'); return;
    }
    if (pin1 !== pin2) {
      _showSetupError('PINs do not match. Please try again.');
      Security._shakeCard('setup-overlay');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Securing...';

    try {
      await Security.setupPIN(pin1);
      overlay.style.display = 'none';

      // Unlock app
      if (typeof onAppUnlocked === 'function') onAppUnlocked();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set PIN & Secure Data';
      _showSetupError(err.message || 'Failed to set PIN. Please try again.');
    }
  });

  // Allow Enter key in confirm field
  pinConfirm && pinConfirm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });

  function _showSetupError(msg) {
    if (!errEl) return;
    errEl.textContent = SecurityManager.sanitizeText(msg);
  }
}

function _wireSecuritySettingsEvents() {
  // Manual Lock button in sidebar (id set in index.html)
  const lockNowBtn = document.getElementById('manual-lock-btn');
  if (lockNowBtn) {
    lockNowBtn.addEventListener('click', () => Security.lock('Manual lock'));
  }
}
