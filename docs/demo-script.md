# OpenCV AI Competition 2026: 5-Minute Demo Script

## 0:00 - 0:30: The Problem
"Students in low-bandwidth regions rely heavily on physical notes, handouts, and whiteboards. Study-Smart is an offline-first PWA, but it currently requires manual data entry. We need a way to digitize physical material directly into study intelligence."

## 0:30 - 1:15: Perception (OpenCV in Action)
Open the "Smart Scan" tab. Click "Start Camera". Show the OpenCV pipeline detecting the document boundaries in real-time. Emphasize that this is running *locally* on the device via opencv.js.

## 1:15 - 1:45: Decision (Agentic Quality Control)
Intentionally shake the camera to produce a blurred image. Click "Process Scan".
*Agent Trace:* "Image is too blurred. Please hold the camera steady."
The agent actively rejected the poor input using OpenCV's Laplacian Variance.

## 1:45 - 3:15: Action & Extraction
Take a clear scan of Data Networks notes.
Click "Process Scan".
The agent accepts the scan, applies perspective correction, and sends the optimized payload to AWS.
Show the extracted concepts: "IPv4 addressing", "CIDR".

## 3:15 - 4:15: Integration (Human Approval)
The agent proposes 5 new flashcards and an extra 25 minutes of study time for "Data Networks".
Click "Approve & Integrate".
Show the modules and flashcards updated instantly in the offline database.

## 4:15 - 5:00: Architecture & Conclusion
Briefly show the architecture diagram (docs/architecture.md). Explain the serverless AWS backend and privacy-first S3 lifecycle policies. Conclude with the impact on student productivity.
