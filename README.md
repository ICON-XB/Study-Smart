# StudySmart 📚 — AI Exam Architect

A beautiful, secure, freemium PWA study organiser built for Namibian university students.

## Features

### 🆓 Free Tier
- Up to **5 modules** and **60 flashcards**
- Smart Curriculum Importer (NUST, UNAM, IUM + top African universities)
- Smart Study Scheduler (exam-proximity, difficulty, even-distribution)
- Leitner Spaced-Repetition Flashcard System (5-box)
- Pomodoro Focus Timer with synthesized audio (offline)
- PIN-secured AES-256 encrypted local storage
- Works fully offline as a PWA (installable on iOS, Android, Windows)

### 👑 Premium (NAD 50/month)
- Unlimited modules & flashcards
- **Jarvis AI Assistant** (powered by Google Gemini)
- PDF Notes per module
- Progress Analytics & Charts
- Push Notifications
- Voice-to-Flashcard
- Study Group sharing

## Getting Started

1. Open `index.html` in any modern browser (Chrome, Safari, Edge, Firefox)
2. Create your security PIN on first launch
3. Add your study modules and let the scheduler do the rest!

### Jarvis AI Setup (Premium)
1. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Go to the **Jarvis AI** tab in the app
3. Enter and save your key — it is stored encrypted on your device

## Tech Stack

- **Pure HTML / CSS / JavaScript** — no build tools needed
- **Web Crypto API** — AES-GCM 256-bit encryption, PBKDF2-SHA-256 PIN hashing
- **Service Worker** — full offline support
- **Google Gemini API** — AI study assistant
- **PWA** — installable, fast, works offline

## Deployment

### GitHub Pages (Free)
1. Push this repo to GitHub
2. Go to **Settings → Pages → Source → main branch / root**
3. Your app will be live at `https://yourusername.github.io/studysmart`

### Stripe Integration (for Premium)
1. Create a [Stripe](https://stripe.com) account
2. Create a Payment Link product at **NAD 50/month**
3. Paste the URL into the `href` of `#stripe-checkout-btn` in `index.html`

## License

MIT — free to use and modify. Attribution appreciated.
