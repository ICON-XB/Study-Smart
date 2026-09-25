# Study-Smart — launch audit report

Date: 25 September 2026. Project: `C:\Users\kayel\.gemini\antigravity\scratch\study-organizer` (offline web app/PWA on GitHub Pages; optional Paddle Premium with an AWS entitlement service). Git repository: ICON-XB/Study-Smart.

## Verdict

Study-Smart can go live as a **free** app once the lawyer has cleared the remaining `[[REVIEW]]` points. This version was tested end to end in a real browser (27/27 checks). Premium stays switched off until you configure Paddle and deploy the entitlement service. The code handles both states.

## How this was checked

- **End-to-end browser tests** (Playwright, Chromium, `tests/e2e_test.py`) against a local server. They cover:
  - first visit and PIN setup, including the PIN screen at 390 px phone width;
  - encryption at rest;
  - export and import;
  - AI calls with a mocked Gemini;
  - XSS attempts;
  - OpenCV scanning of a real photo;
  - offline start;
  - the legal pages;
  - Content-Security-Policy violations.
- **Unit tests** for the Paddle webhook and entitlement service (`aws/tests`).
- **Release gate:** `tools/release_check.js`.
- All three were re-run on 25 September after today's changes (your business details, footer name, service-worker version).

## Audit

Statuses as defined in the brief:
- **Fixed and verified:** changed and checked by a test that ran.
- **Implemented but unverified:** changed, but not run in a test.
- **Already satisfied**
- **Not applicable**
- **Blocked:** needs you.

| Area | Item | Status | Notes |
| --- | --- | --- | --- |
| Security | Encryption key derived weakly from the PIN; the stored check value could decrypt data | Fixed and verified | PBKDF2 (310,000 iterations) → HKDF gives a separate verifier and AES-GCM key. Old data is migrated and re-encrypted on first unlock. |
| Security | Scanned images stored unencrypted | Fixed and verified | Images in IndexedDB are encrypted with the same key; at most 200 are kept. |
| Security | PIN guessing | Fixed and verified | Lockout with growing waits. After 10 wrong attempts all data is wiped, with warnings first. The PIN is 4–12 digits. |
| Security | Hidden Premium backdoor (`PREMIUM-TEST`) and a fake Google sign-in stub | Fixed and verified | Removed. |
| Security | Gemini key sent in the URL | Fixed and verified | Sent in the `x-goog-api-key` header, never included in backups. |
| Security | XSS through AI replies, scan text and module names | Fixed and verified | Text-only rendering, and options built with `new Option`; the e2e checks inject `<img onerror>`. |
| Security | No Content-Security-Policy; clickjacking | Fixed and verified | A strict CSP in meta tags (0 violations in the e2e run) plus a frame-buster. GitHub Pages can't send real headers; see RELEASE_CHECKLIST §4. |
| Security | Paddle webhooks and entitlements | Fixed and verified (unit tests) | HMAC signature check with a timestamp, dedupe recorded only after a successful apply, protection against stale and out-of-order events, and throttled API Gateway, all in AWS SAM. **Not deployed** (needs your AWS account). |
| Reliability | Data not saved in some paths; saving while locked | Fixed and verified | Every change is saved, saves wait while the app is locked, and import validates and normalises the data. |
| Reliability | Offline use | Fixed and verified | Service worker (now `studysmart-v6`, so installed copies update): app-shell cache, network-first pages, offline fallback. |
| Reliability | Camera "Start camera" did nothing; scan perspective warp was faked | Implemented (camera) / Fixed and verified (warp) | The OpenCV warp and page detection are verified on a real photo. The live camera needs a real phone test. |
| Usability | Demo modules seeded automatically | Fixed and verified | Replaced with an optional "Try with example modules" button. |
| Usability | Landing page claims the app couldn't back up | Fixed and verified | Claims rewritten to match what the app does. No horizontal scroll at 390 px. |
| Usability | Returning users saw the setup screen over the PIN screen | Fixed and verified | Fixed; found by the e2e test. |
| Store/listing | Honest Premium modal; free limits (5 modules / 60 flashcards) only when billing is configured | Fixed and verified | — |
| App-specific | AI consent (Gemini, 18+, free-tier data use), editable review before saving, AI labels | Fixed and verified | — |
| App-specific | University "templates" | Fixed and verified | Labelled as unofficial examples; no logos. |
| Legal | Privacy notice, terms, copyright and rights complaints, third-party notices, 404 page | Fixed and verified (pages load; draft banner shown) | Built from `legal-src/*.md` by `tools/build_legal.py`. Your business details were filled in on 25 September. |
| Legal | Data controls | Fixed and verified | Settings & Privacy has Export backup, Erase all data, Turn off AI, Remove Gemini key and Change PIN, plus copy/restore of the purchase ID. |
| Legal | Remaining legal points | **Blocked** | 7 `[[REVIEW]]` markers for a lawyer, and the AWS region (1 `[[MISSING]]`, only if you use Premium). |
| Handover | Docs and tests | Done | README, `docs/privacy.md`, RELEASE_CHECKLIST, LEGAL_REVIEW, this report and `tests/`. |

## Your decisions applied (25 September)

- Operator Deon Kayele, Windhoek, Namibia.
- Privacy and rights complaints: iconicindustries0@gmail.com. Support: kayeledeon@gmail.com.
- Minimum age 13, with a parent's or guardian's permission under 18. The AI features stay 18+, as Google's Gemini terms require.
- The footer now reads "© 2026 Deon Kayele" (it was "ICON-XB").

## Tests

| Test | Result |
| --- | --- |
| `tests/e2e_test.py` (Playwright, Chromium) | **27/27 pass** (re-run 25 Sep) |
| `aws/tests` (Paddle webhook and entitlement, 18 tests) | **18/18 pass** (re-run 25 Sep) |
| `tools/release_check.js` | Fails only on the expected legal markers. Paddle is unconfigured, which is fine for a free launch. |

## Unresolved issues

1. **Legal review:** 7 `[[REVIEW]]` points (governing law, liability, privacy-law scope, Paddle wording, and so on). See LEGAL_REVIEW.md. A full postal address is advisable before selling Premium.
2. **Real devices:** the live camera, PWA install and offline use on Android and iOS, and a screen-reader pass have not been tested.
3. **Hosting headers:** GitHub Pages can't send real security headers. Move to a host that can if you need them (RELEASE_CHECKLIST §4).
4. **Fonts (resolved 25 Sep).** Inter is now bundled (`fonts/`, with its OFL licence), and the app no longer contacts Google Fonts; the privacy notice says so. Only weights 400–600 are included, so bold text (700) renders as semibold.
5. **Published helper files.** The repository root also contains helper scripts and notes that GitHub Pages publishes: `agent_updates.py`, `clean_html.py`, `fix_agent.py`, `redesign*.py`, `update_scan_ui.py`, `update_schema.py`, `implementation_plan.md`. They're harmless but public. Move them out of the published folder if you prefer.
6. **Git.** Nothing was committed or pushed, and history was not rewritten. Your local `main` has diverged from GitHub, so review `git status` and commit when you're ready. An old live Paddle client-side token is in the git history; client tokens are public by design, but rotate it if you no longer use it.

## What you must do before release

See `RELEASE_CHECKLIST.md`:
1. Legal review, then `python tools/build_legal.py`.
2. Free launch as-is, or set up Paddle and deploy `aws/` for Premium (AWS and Paddle costs apply).
3. Turn on Enforce HTTPS in the GitHub Pages settings.
4. Run the tests before each release.
5. Test on real phones.

## Backups

- Originals: `_launch_fixes_backup/2026-09-23_original/`.
- The legal sources, `index.html`, `sw.js` and `LEGAL_REVIEW.md` as they were before today: `_launch_fixes_backup/legal_before_business_details_2026-09-25/`.
