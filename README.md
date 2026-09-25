# Study-Smart Vision
*See it. Understand it. Master it.*

An offline-first study app (PWA) for planning study time, keeping spaced-repetition flashcards, running focus timers and scanning study material. Built in Namibia for students everywhere, and entered in the OpenCV AI Competition 2026.

## What runs where

- **On the device, always:** the whole app works offline. Study data is stored in the browser and encrypted with AES-GCM, using a key derived from the user's PIN (PBKDF2 + HKDF; the stored PIN check value cannot decrypt data). OpenCV.js checks photo quality (blur and lighting), finds the page outline and straightens it (perspective correction). Cleaned scans are stored encrypted in IndexedDB.
- **Optional AI, with the user's own Google Gemini API key:** the Jarvis assistant, AI flashcard suggestions from a scan, and "Build My Semester". Nothing is sent until the user agrees to the AI notice, which includes the 18+ age requirement from Google's terms. The user reviews every suggestion before anything is saved.
- **Optional Premium (Paddle):** switched off until paddle-integration.js is configured and the entitlement service in ws/ is deployed. Premium is granted only after Paddle's signed webhook has been verified on the server.
- **No Study-Smart accounts, analytics or trackers.**

## Pages

- index.html: public landing page.
- pp.html: the app (installable PWA).
- privacy.html, 	erms.html, copyright.html: generated from legal-src/*.md by python tools/build_legal.py. They are **drafts** until the markers are resolved; see LEGAL_REVIEW.md.
- 
otices.html: third-party notices.
- 404.html

## Develop and test

`ash
python -m http.server 8802                     # serve the folder
python tests/e2e_test.py http://localhost:8802 # browser tests (Playwright + Chromium)
cd aws && python -m unittest discover -s tests # Paddle webhook / entitlement tests
node tools/release_check.js                    # pre-release gate
`

Release steps are in RELEASE_CHECKLIST.md. The audit and change log is in LAUNCH_AUDIT_REPORT.md.

### Free Tier
- Up to **5 modules** and **60 flashcards**
- Smart Curriculum Importer (NUST, UNAM, IUM + top African universities)
- Smart Study Scheduler (exam-proximity, difficulty, even-distribution)
- Leitner Spaced-Repetition Flashcard System (5-box)
- Pomodoro Focus Timer with synthesized audio (offline)
- PIN-secured AES-256 encrypted local storage
- Works fully offline as a PWA (installable on iOS, Android, Windows)

### Premium (NAD 50/month)
- Unlimited modules & flashcards
- **Jarvis AI Assistant** (powered by Google Gemini)
- PDF Notes per module
- Progress Analytics & Charts
- Push Notifications
- Voice-to-Flashcard
- Study Group sharing

## Documentation

- [Architecture](docs/architecture.md)
- [Agentic Vision Loop](docs/agentic-vision.md)
- [Privacy](privacy.html)
- [Evaluation](docs/evaluation.md)
- [Demo Script](docs/demo-script.md)

## AWS Deployment
The backend uses AWS API Gateway, Lambda, and S3. See the aws/ directory for the SAM template.

## Getting Started
1. Serve the project locally (e.g., python -m http.server).
2. Navigate to the app in your browser.
3. Use the "Smart Scan" tab to start the OpenCV agent loop.

## Global University Support
Study-Smart Vision is designed for students worldwide. Namibia remains its origin. Presets exist for convenience across all continents. Any university can be manually added. Smart Scan and "Build My Semester" can derive academic structure from student-provided materials with user confirmation.

## Build My Semester
Students can upload multiple documents (e.g., syllabus, notes). The system processes them sequentially using OpenCV, tracks performance metrics, and extracts a proposed academic structure (Modules, Assessments). It requests explicit confirmation for any low-confidence data before transactionally committing the semester to the offline database.

## Public Landing Page & Routing Architecture
To provide a professional entry point for students and OpenCV competition judges without breaking local storage or PWA scope:
- The public marketing gateway lives at /index.html.
- The actual Study-Smart application lives at /app.html.
- If an existing user opens their installed PWA while offline, the application safely routes them to /app.html via detection in index.html or loads /app.html directly based on the updated manifest.json start URL.

## PWA Installation
Study-Smart fully supports PWA installation. The landing page handles the beforeinstallprompt event programmaticly on Android/Chromium, and displays fallback UI instructions for iOS Safari.
