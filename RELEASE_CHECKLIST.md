# Study-Smart — release checklist (owner actions)

The code changes are listed in `LAUNCH_AUDIT_REPORT.md`. Run `node tools/release_check.js` before every publish. It fails until the blocking items below are done.

## 1. Legal (blocking)

1. Your business details were filled in on 25 September 2026. The only `[[MISSING: …]]` left is the AWS region, and only if you use Premium.
2. Have a lawyer resolve every `[[REVIEW: …]]` (see `LEGAL_REVIEW.md`).
3. Run `python tools/build_legal.py`, check the pages, and remove the draft entries from `notices.html`.

## 2. Free launch (no Premium)

With `PADDLE_CONFIG` left empty, the app is completely free. The Premium button is hidden and the 5-module / 60-flashcard limits are off. You can publish this way now and add Premium later.

## 3. Paddle Premium (optional)

1. **Paddle sandbox:** create the product and price. The price label shown in the app must match it exactly. Create a **client-side token**. Under Notifications, add a destination and copy its **secret key**.
2. **Deploy the entitlement service** in `aws/` (AWS account required; small running costs):
   ```bash
   aws secretsmanager create-secret --name studysmart/paddle --secret-string '{"webhookSecret":"<notification secret>"}'
   cd aws && sam build && sam deploy --guided   # parameters: PaddleSecretArn, AllowedOrigin
   python -m unittest discover -s tests
   ```
   Register the `PaddleWebhookUrl` output as the Paddle notification destination for the `subscription.*` events.
3. Fill in `PADDLE_CONFIG` in `paddle-integration.js` (`clientToken`, `priceId`, `environment`, `entitlementUrl`, `priceLabel`). Add the entitlement host (for example `https://abc123.execute-api.<region>.amazonaws.com`) to `connect-src` in the CSP in `app.html`. `tools/release_check.js` checks this.
4. **Sandbox test:** buy → Premium activates within about a minute. Cancel → Premium stays until the period ends. Test a refund. Restore on a second browser with the purchase ID. Test the page going offline mid-checkout.
5. Switch to `environment: 'production'` with live keys. The old live token in the git history (`paddle-integration.js` comments) is a public client token, but rotate it if you no longer use it.
6. Paddle must approve your domain and business before live payments. Check that Paddle supports your country, the currency you want (e.g. NAD) and your product category.

## 4. Hosting (GitHub Pages)

- GitHub Pages cannot set HTTP headers. The CSP is in `<meta>` tags, and anti-framing is done in `security.js`. For real `Content-Security-Policy`, `frame-ancestors`, `Referrer-Policy` and `Permissions-Policy` headers, use a host that supports headers (Cloudflare Pages, Netlify, or Cloudflare in front of GitHub Pages).
- Turn on **Enforce HTTPS** in the repository's Pages settings.
- `404.html` is picked up by GitHub Pages automatically.
- The Inter font is self-hosted (`fonts/`, with `fonts/OFL.txt`), so the app no longer contacts Google Fonts. Only weights 400, 500 and 600 are bundled; text styled at 700 shows as 600. For a true bold, add `Inter-Bold.ttf` and a matching `@font-face` rule at the end of `style.css`.

## 5. AI (users' own keys)

No action is needed from you: each user brings their own Gemini key. Keep the in-app AI notice accurate if Google changes its terms (free-tier data use, the 18+ age requirement).

## 6. Before each release

```bash
python -m http.server 8802 &
python tests/e2e_test.py http://localhost:8802
cd aws && python -m unittest discover -s tests && cd ..
node tools/release_check.js
```

Bump `CACHE_NAME` in `sw.js` when you change cached files, so installed apps update.

## 7. Manual checks (not automated)

- A real phone camera: Start Camera → Capture on Android Chrome and iOS Safari. Denying the camera permission should show the fallback message.
- A real Gemini key (your own) with a real photo of course material: suggestions look sensible, the review screen can be edited, and nothing is saved until you approve.
- Installing the PWA on Android and iOS, then using it offline.
- Screen reader pass on the PIN screens, the scan review and the settings.
