# Privacy Notice — Study-Smart

Version 2026-09-23-draft. This is a draft pending legal review. Text in double square brackets marks information that must be completed or reviewed before release.

## Who we are

Study-Smart (the "app") is provided by Deon Kayele, an individual ("we", "us"), Windhoek, Namibia. Privacy questions: iconicindustries0@gmail.com.

## The short version

- Study-Smart has no user accounts. Your modules, flashcards, schedule, study sessions and scans are stored **in your browser on this device**, encrypted with a key made from your PIN. We do not receive them.
- Smart Scan cleans up photos **on your device** using OpenCV. Nothing is uploaded unless you turn on AI features.
- AI features are optional and use **your own Google Gemini API key**. When you use them, your question or scan goes directly from your browser to Google under your agreement with Google, not to us.
- If you buy Premium, Paddle handles the payment as the merchant of record. We store a random purchase ID and your subscription status so Premium can be switched on.

## What is stored on your device

| Data | Where | Protection |
| --- | --- | --- |
| Modules, topics, exam dates, flashcards, schedule, study sessions, streak, settings | Browser localStorage | Encrypted (AES-GCM, key derived from your PIN with PBKDF2) |
| Scanned document images | Browser IndexedDB | Encrypted with the same key |
| Your Gemini API key (if you add one) | Browser localStorage, inside the encrypted settings | Encrypted; never included in backup exports |
| PIN check value and salt | Browser localStorage | Your PIN is not stored; only a salted check value derived with PBKDF2 and HKDF, which cannot decrypt your data |
| Purchase ID and last Premium status (if billing is enabled) | Browser localStorage | Not encrypted; not personal on its own |

Anyone who knows your PIN and uses this browser can open your data. The PIN protects against casual access, but someone with a copy of this browser's data could guess a short PIN, so use a longer PIN if your notes are sensitive. After 10 wrong PIN attempts the app erases the study data on this device, so export a backup regularly.

## When data leaves your device

**Google Gemini (optional, your own key).** If you add a Gemini API key and use the assistant or AI scanning, the text you type, or the cleaned image of the page you scan, is sent from your browser to Google's Gemini API. Google processes it under the Gemini API terms you accepted when you created the key. Google's terms say that on its **free (unpaid) tier**, Google may use prompts and responses to improve its products, and human reviewers may read them, and that personal or confidential information should not be submitted. On a paid tier, Google says it does not use them to improve its products. Google also requires API users to be **18 or older**. Do not scan documents that contain other people's personal information.

**Paddle (only if you buy Premium).** Paddle is the merchant of record for purchases. It collects your email address, payment details, country and IP address to process the payment, taxes and receipts, under Paddle's own privacy notice. We receive your subscription status and a Paddle customer ID linked to your purchase ID.

**Our entitlement service (only if you buy Premium).** It runs on Amazon Web Services in [[MISSING: AWS region]] and stores your purchase ID, Paddle subscription and customer IDs, subscription status, billing period end date and the time of the last update. It does not receive your study data. Request logs (without study data) are kept for 30 days.

**Website hosting.** The app is served from GitHub Pages. GitHub receives your IP address and browser details when pages load, under GitHub's privacy statement. [[REVIEW: confirm hosting provider for the production domain]]

**Fonts and payment script.** The Inter typeface is included with the app, so no font service is contacted. Paddle's checkout script is loaded from cdn.paddle.com only when you start a purchase.

**Curriculum search helper.** If you use it, a DuckDuckGo search for the university and course names you typed opens in a new tab.

We do not use analytics, advertising or tracking tools, and we do not sell personal information.

## Your choices

- **Export:** Settings & Privacy → Export backup (a JSON file without your Gemini key).
- **Delete:** Settings & Privacy → Erase all data removes your study data, scans, Gemini key, PIN and the app's cached files from this browser. Your purchase ID is kept so Premium can be restored; clear this site's data in your browser settings to remove that too.
- **AI:** Settings & Privacy lets you turn AI features off or remove your Gemini key at any time. The rest of the app works offline without them.
- **Premium records:** email iconicindustries0@gmail.com with your purchase ID to delete the entitlement record. Paddle keeps its own records as required by law.

## Children and students

Study-Smart is designed for university and college students. AI features need a Gemini API key, which Google allows only for people aged 18 or over. You must be at least 13 to use Study-Smart; users under 18 need permission from a parent or guardian. The AI features are only for people aged 18 or over.

## Legal basis and your rights

[[REVIEW: legal bases and rights for each market where the app is offered. Namibia had no comprehensive data-protection statute in force as of mid-2026 (a Data Protection Bill was tabled in 2025); confirm the current position, and GDPR / POPIA or other laws if the app targets people in those places.]] Contact us to exercise any rights you have. Because we do not hold your study data, we cannot access or recover it for you.

## Changes

We will update the version date above and show a notice in the app before significant changes take effect.

## Contact

Deon Kayele · iconicindustries0@gmail.com · Windhoek, Namibia
