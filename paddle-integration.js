/**
 * ============================================================
 * STUDYSMART � PADDLE BILLING INTEGRATION
 * paddle-integration.js
 * ============================================================
 *
 * DUMI � SETUP INSTRUCTIONS (5 minutes):
 *
 *  1. Log in at vendors.paddle.com
 *
 *  2. Get your CLIENT-SIDE TOKEN:
 *     Developer Tools > Authentication > CLICK "Client-side tokens" TAB (next to API keys)
 *     Paste it below: live_300d87226e3d422715bb19ca597
 *
 *  3. Create your product:
 *     Catalog > Products > New Product
 *     Name: "StudySmart Premium"
 *     Billing: Recurring, Monthly, NAD 50
 *     Copy the Price ID (starts with "pri_") and paste: pro_01m0w2m41zwpr52kby0ww8sb1f
 *
 *  4. Push to GitHub - done!
 *
 * ============================================================
 */

'use strict';

// ============================================================
// DUMI: REPLACE THESE TWO VALUES WITH YOUR REAL IDs
// ============================================================
const PADDLE_CONFIG = {
  clientToken: 'PASTE_YOUR_CLIENT_TOKEN_HERE', // e.g. test_ct_... or live_ct_...
  priceId:     'PASTE_YOUR_PRICE_ID_HERE',     // e.g. pri_01j...
  environment: 'production',                   // change to 'sandbox' for testing
};
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Paddle === 'undefined') {
    console.warn('[Paddle] SDK failed to load. Payment unavailable.');
    return;
  }

  Paddle.Environment.set(PADDLE_CONFIG.environment);

  Paddle.Initialize({
    token: PADDLE_CONFIG.clientToken,
    eventCallback: function (data) {
      if (data.name === 'checkout.completed') {
        _handlePremiumUnlock(data);
      }
    }
  });

  const checkoutBtn = document.getElementById('paddle-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', _openPaddleCheckout);
  }
});

function _openPaddleCheckout() {
  if (typeof Paddle === 'undefined') {
    alert('Payment system unavailable. Please check your connection.');
    return;
  }
  if (PADDLE_CONFIG.clientToken === 'PASTE_YOUR_CLIENT_TOKEN_HERE' ||
      PADDLE_CONFIG.priceId === 'PASTE_YOUR_PRICE_ID_HERE') {
    alert('Payment not configured yet. Dumi: add your Paddle Client-side token and Price ID to paddle-integration.js');
    return;
  }
  Paddle.Checkout.open({
    items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }],
    customData: {
      app: 'StudySmart'
    }
  });
}

async function _handlePremiumUnlock(data) {
  console.log('[Paddle] Payment successful:', data);
  if (typeof appState !== 'undefined') {
    appState.isPremium = true;
    if (typeof saveState === 'function') await saveState();

    const modal = document.getElementById('premium-modal');
    if (modal) modal.classList.remove('active');

    const premiumBtn = document.getElementById('premium-upgrade-btn');
    if (premiumBtn) {
      premiumBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Premium';
      premiumBtn.style.color = '#f59e0b';
      premiumBtn.style.borderColor = '#f59e0b';
      premiumBtn.onclick = null;
    }

    _showPremiumSuccessToast();
  }
}

function _showPremiumSuccessToast() {
  const toast = document.createElement('div');
  toast.style.cssText = [
    'position:fixed', 'bottom:30px', 'left:50%', 'transform:translateX(-50%)',
    'background:linear-gradient(135deg,#8b5cf6,#3b82f6)', 'color:#fff',
    'padding:16px 28px', 'border-radius:14px', 'font-size:15px', 'font-weight:600',
    'box-shadow:0 8px 32px rgba(139,92,246,0.4)', 'z-index:99999'
  ].join(';');
  toast.textContent = 'Welcome to StudySmart Premium! All features unlocked.';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
