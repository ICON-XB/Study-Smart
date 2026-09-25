#!/usr/bin/env node
// Study-Smart pre-release gate.  Run:  node tools/release_check.js
// Exits with code 1 while anything that blocks a public release remains.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const problems = [];
const warnings = [];

// 1. Legal drafts must be finished.
for (const f of ['legal-src/privacy.md', 'legal-src/terms.md', 'legal-src/copyright.md', 'notices.html']) {
  const n = (read(f).match(/\[\[(MISSING|REVIEW):/g) || []).length;
  if (n) problems.push(`${f}: ${n} unresolved [[MISSING]]/[[REVIEW]] markers (then run tools/build_legal.py)`);
}

// 2. No inline scripts or inline event handlers (the CSP blocks them).
for (const f of ['app.html', 'index.html', 'privacy.html', 'terms.html', 'copyright.html', 'notices.html', '404.html']) {
  const html = read(f);
  if (/\son[a-z]+\s*=\s*["']/i.test(html)) problems.push(`${f}: inline event handler found`);
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) problems.push(`${f}: inline <script> found`);
  if ((html.match(/http-equiv="Content-Security-Policy"/g) || []).length !== 1) problems.push(`${f}: must have exactly one CSP meta tag`);
}

// 3. Obvious secrets in shipped files.
const secretRe = /(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|pdl_(live|sdbx)_apikey_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16})/;
for (const f of ['app.js', 'agent.js', 'security.js', 'paddle-integration.js', 'vision.js', 'idb.js', 'app.html', 'index.html']) {
  if (secretRe.test(read(f))) problems.push(`${f}: looks like it contains a secret key`);
}

// 4. Billing configuration is complete and the CSP allows the entitlement API.
const paddle = read('paddle-integration.js');
const val = (k) => (paddle.match(new RegExp(`${k}:\\s*'([^']*)'`)) || [])[1] || '';
const entitlementUrl = val('entitlementUrl');
if (!val('clientToken') && !val('priceId')) {
  warnings.push('Paddle is not configured: Premium is switched off and free limits are not enforced (OK for a free launch).');
} else {
  if (!/^pri_/.test(val('priceId')) || !val('priceLabel') || !/^https:\/\//.test(entitlementUrl)) {
    problems.push('PADDLE_CONFIG is only partly filled in (clientToken, priceId, entitlementUrl, priceLabel).');
  }
  if (val('environment') !== 'production') warnings.push("PADDLE_CONFIG.environment is not 'production'.");
  if (entitlementUrl) {
    const host = new URL(entitlementUrl).host;
    if (!read('app.html').includes(host)) problems.push(`app.html CSP connect-src must include https://${host}`);
  }
}

// 5. Every file the service worker pre-caches must exist.
const sw = read('sw.js');
const shell = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
for (const f of shell) if (!fs.existsSync(path.join(root, f))) problems.push(`sw.js pre-caches missing file: ${f}`);

warnings.forEach((w) => console.log('WARNING: ' + w));
if (problems.length) {
  console.error('Release check FAILED:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('Release check passed.');
