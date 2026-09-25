/**
 * ============================================================
 * STUDY-SMART — PADDLE BILLING INTEGRATION (paddle-integration.js)
 * ============================================================
 *
 * How premium works:
 *  1. The app creates a random install ID (the user's "purchase ID").
 *  2. Checkout passes it to Paddle as customData.installId.
 *  3. Paddle sends a signed webhook to the entitlement service in aws/,
 *     which verifies the signature and records the subscription.
 *  4. The app asks that service whether this install has premium.
 *
 * A "checkout.completed" event in the browser is NOT treated as proof of
 * payment. Until all four PADDLE_CONFIG values below are filled in, purchases
 * are switched off and the free-plan limits are not enforced (nobody is
 * blocked by an upgrade they cannot buy).
 *
 * Setup steps: RELEASE_CHECKLIST.md → "Paddle".
 * ============================================================
 */

'use strict';

const PADDLE_CONFIG = {
  clientToken: '',        // Paddle client-side token (public): test_… or live_…
  priceId: '',            // Paddle price ID: pri_…
  environment: 'sandbox', // 'sandbox' for testing, 'production' for live
  entitlementUrl: '',     // https://…/entitlement (aws/ stack output EntitlementUrl)
  // Shown before checkout. Must match the Paddle price exactly, e.g. 'N$50.00 per month'.
  priceLabel: '',
};

const BILLING_KEYS = {
  INSTALL_ID: 'ss_install_id',
  ENTITLEMENT: 'ss_entitlement',
};

// Premium keeps working offline until the paid period ends plus this grace.
const OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const StudySmartBilling = (() => {
  let paddleReady = false;

  function isConfigured() {
    return Boolean(
      PADDLE_CONFIG.clientToken &&
      /^pri_[a-z0-9]+$/i.test(PADDLE_CONFIG.priceId) &&
      /^https:\/\//.test(PADDLE_CONFIG.entitlementUrl) &&
      PADDLE_CONFIG.priceLabel
    );
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function getInstallId() {
    let id = null;
    try {
      id = localStorage.getItem(BILLING_KEYS.INSTALL_ID);
    } catch { /* storage unavailable */ }
    if (!id || !/^[a-f0-9]{32}$/.test(id)) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      try {
        localStorage.setItem(BILLING_KEYS.INSTALL_ID, id);
      } catch { /* storage unavailable */ }
    }
    return id;
  }

  /** Premium according to the last server answer (valid offline for a while). */
  function cachedPremium() {
    const cached = readJson(BILLING_KEYS.ENTITLEMENT);
    if (!cached || cached.premium !== true) return false;
    const ends = cached.periodEndsAt ? Date.parse(cached.periodEndsAt) : NaN;
    if (Number.isNaN(ends)) {
      return Date.now() - (cached.checkedAt || 0) < OFFLINE_GRACE_MS;
    }
    return Date.now() < ends + OFFLINE_GRACE_MS;
  }

  function applyPremium(isPremium) {
    if (typeof appState !== 'undefined') appState.isPremium = isPremium;
    document.dispatchEvent(new CustomEvent('studysmart:premium', { detail: { premium: isPremium } }));
  }

  /** Asks the entitlement service. Returns true/false, or null if unreachable. */
  async function refreshEntitlement() {
    if (!isConfigured()) {
      applyPremium(false);
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `${PADDLE_CONFIG.entitlementUrl}?installId=${encodeURIComponent(getInstallId())}`;
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const premium = body && body.premium === true;
      try {
        localStorage.setItem(BILLING_KEYS.ENTITLEMENT, JSON.stringify({
          premium,
          periodEndsAt: typeof body.periodEndsAt === 'string' ? body.periodEndsAt : null,
          checkedAt: Date.now(),
        }));
      } catch { /* storage unavailable */ }
      applyPremium(premium);
      return premium;
    } catch {
      applyPremium(cachedPremium());
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Loads Paddle.js only when someone actually starts a purchase, so
   *  Paddle is not contacted on every visit. */
  function loadPaddleScript() {
    if (typeof Paddle !== 'undefined') return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => resolve(typeof Paddle !== 'undefined');
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function initPaddle() {
    if (!isConfigured()) return false;
    if (paddleReady) return true;
    if (!(await loadPaddleScript())) return false;
    Paddle.Environment.set(PADDLE_CONFIG.environment);
    Paddle.Initialize({
      token: PADDLE_CONFIG.clientToken,
      eventCallback(event) {
        if (event && event.name === 'checkout.completed') {
          waitForActivation();
        }
      },
    });
    paddleReady = true;
    return true;
  }

  function toast(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:fixed', 'bottom:30px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1f2937', 'color:#fff', 'padding:14px 22px', 'border-radius:12px',
      'font-size:14px', 'max-width:min(92vw,480px)', 'z-index:99999', 'text-align:center',
    ].join(';');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }

  /** After checkout, wait for Paddle's webhook to reach the server. */
  async function waitForActivation() {
    toast('Payment received. Activating Premium…');
    const delays = [2000, 3000, 5000, 8000, 13000, 21000];
    for (const delay of delays) {
      await new Promise((r) => setTimeout(r, delay));
      if (await refreshEntitlement()) {
        const modal = document.getElementById('premium-modal');
        if (modal) modal.classList.remove('active');
        toast('Premium is active. Thank you!');
        return;
      }
    }
    toast(`Your payment is still being confirmed. Premium will switch on automatically. If it has not after 15 minutes, contact support with your purchase ID ${getInstallId()}.`);
  }

  async function openCheckout() {
    if (!isConfigured()) return false;
    if (!(await initPaddle())) {
      toast('The payment system could not load. Check your connection and try again.');
      return false;
    }
    Paddle.Checkout.open({
      items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }],
      customData: { installId: getInstallId() },
    });
    return true;
  }

  /** Restores premium on this device using the purchase ID from another one. */
  async function restoreWithPurchaseId(purchaseId) {
    const id = String(purchaseId || '').trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(id)) return 'invalid';
    const previous = getInstallId();
    try {
      localStorage.setItem(BILLING_KEYS.INSTALL_ID, id);
    } catch {
      return 'error';
    }
    const result = await refreshEntitlement();
    if (result === true) return 'restored';
    // Keep this device's own purchase ID if the other one has no premium.
    try {
      localStorage.setItem(BILLING_KEYS.INSTALL_ID, previous);
    } catch { /* ignore */ }
    if (result === false) {
      await refreshEntitlement();
      return 'not_found';
    }
    return 'offline';
  }

  return {
    isConfigured,
    getInstallId,
    refreshEntitlement,
    cachedPremium,
    openCheckout,
    restoreWithPurchaseId,
    priceLabel: () => PADDLE_CONFIG.priceLabel,
  };
})();

window.StudySmartBilling = StudySmartBilling;

document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.getElementById('paddle-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (!(await StudySmartBilling.openCheckout())) {
        console.info('[Billing] Purchases are switched off until PADDLE_CONFIG is complete.');
      }
    });
  }
});
