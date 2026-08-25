/**
 * ============================================================
 * STUDYSMART — PADDLE PAYMENT INTEGRATION
 * paddle-integration.js
 * ============================================================
 *
 * DUMI — SETUP INSTRUCTIONS (5 minutes):
 *
 *  1. Log in at vendors.paddle.com
 *
 *  2. Get your VENDOR ID:
 *     Developer Tools > Authentication > Vendor ID
 *     Paste it below: PASTE_YOUR_VENDOR_ID_HERE
 *
 *  3. Create your product:
 *     Catalog > Products > New Product
 *     Name: "StudySmart Premium"
 *     Billing: Recurring, Monthly, NAD 50
 *     Copy the Product ID and paste: PASTE_YOUR_PRODUCT_ID_HERE
 *
 *  4. In Paddle: Checkout > Checkout Settings > Default Success URL
 *     Set to: https://icon-xb.github.io/Study-Smart
 *
 *  5. Push to GitHub - done!
 *
 * ============================================================
 */

'use strict';

// ============================================================
// DUMI: REPLACE THESE TWO VALUES WITH YOUR REAL IDs
// ============================================================
const PADDLE_CONFIG = {
  vendorId:    'PASTE_YOUR_VENDOR_ID_HERE',   // e.g. 12345
  productId:   'PASTE_YOUR_PRODUCT_ID_HERE',  // e.g. 678901
  environment: 'production',                  // change to 'sandbox' for testing
};
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Paddle === 'undefined') {
    console.warn('[Paddle] SDK failed to load. Payment unavailable.');
    return;
  }

  if (PADDLE_CONFIG.environment === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  Paddle.Setup({
    vendor: parseInt(PADDLE_CONFIG.vendorId, 10),
    eventCallback: function (data) {
      if (data.event === 'Checkout.Complete' || data.event === 'checkout.completed') {
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
  if (PADDLE_CONFIG.vendorId === 'PASTE_YOUR_VENDOR_ID_HERE' ||
      PADDLE_CONFIG.productId === 'PASTE_YOUR_PRODUCT_ID_HERE') {
    alert('Payment not configured yet. Dumi: add your Paddle Vendor ID and Product ID to paddle-integration.js');
    return;
  }
  Paddle.Checkout.open({
    product: PADDLE_CONFIG.productId,
    title: 'StudySmart Premium',
    message: 'Unlimited modules, Jarvis AI, PDF notes, analytics and more.',
    quantity: 1,
    email: window._userEmail || '',
    successCallback: _handlePremiumUnlock,
    closeCallback: function () {
      console.log('[Paddle] Checkout closed.');
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
