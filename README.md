# Study-Smart Vision
*See it. Understand it. Master it.*

Study-Smart Vision is an offline-first intelligent study system that turns physical learning material into adaptive study plans. Built for the **OpenCV AI Competition 2026**.

## The Vision
We transform the camera from a simple capture tool into an input device for an intelligent study agent. Using **OpenCV 5** running locally in the browser, the system assesses image quality, corrects perspective, and optimizes bandwidth. An Agentic loop then evaluates the data, extracts learning concepts via an **AWS serverless backend**, and automatically generates flashcards and updates study schedules.

## Features
- **Local Preprocessing:** OpenCV.js handles blur detection, contour detection, and perspective correction locally.
- **Agentic Vision:** A continuous Perceive -> Decide -> Act loop ensures only high-quality scans are processed, reducing cloud costs and API errors.
- **Privacy First:** AES-GCM local encryption. Cloud images are stored in ephemeral S3 buckets with aggressive deletion policies.
- **Low-Bandwidth Optimized:** Built as a PWA with local OpenCV cropping to minimize payload sizes for users in emerging markets (e.g., Namibia).

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
- [Privacy Policy](docs/privacy.md)
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
