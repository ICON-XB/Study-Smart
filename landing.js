// Landing page behaviour (kept out of index.html so the page's CSP can block inline scripts).
'use strict';

// Installed app opened from the home screen: go straight to the app.
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  window.location.replace('app.html');
}

document.addEventListener('DOMContentLoaded', () => {
  let deferredPrompt = null;
  const installBtn = document.getElementById('btn-install');
  const installBanner = document.getElementById('install-banner');
  if (!installBtn || !installBanner) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
  });

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') installBtn.style.display = 'none';
      deferredPrompt = null;
    } else {
      // iOS Safari and desktop browsers without an install prompt
      installBanner.style.display = 'block';
      installBtn.style.display = 'none';
    }
  });

  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    installBanner.style.display = 'none';
  });
});
