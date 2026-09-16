# Architecture: Study-Smart Vision

## Overview
Study-Smart Vision uses an offline-first hybrid architecture to bring intelligent, computer-vision-powered study assistance to students, optimized for low-bandwidth environments (e.g., Africa).

## Component Diagram
\\\mermaid
graph TD
    A[Student] -->|Scans Notes| B(Study-Smart PWA)
    B -->|Local Preprocessing| C{OpenCV 5 Pipeline}
    C -->|Quality Assessed| D[Vision Agent]
    
    D -->|Reject| E[UI Feedback: Rescan]
    D -->|Accept| F[AWS API Gateway]
    
    F --> G[AWS Lambda]
    G --> H[Amazon S3 Temp Storage]
    G --> I[AWS Bedrock / AI Extraction]
    
    I -->|Structured Learning Data| G
    G -->|JSON Response| D
    
    D -->|Creates| J[Local Flashcards]
    D -->|Modifies| K[Study Scheduler]
    D -->|Prompts| L[Human Approval]
\\\

## Key Decisions
1. **Local Preprocessing:** OpenCV operations (blur detection, edge detection, perspective transform) run locally on the client device via opencv.js. This drastically reduces upload sizes (important for low-bandwidth regions) and provides instant quality feedback before making any network requests.
2. **Agentic Loop:** The Vision Agent explicitly evaluates the OpenCV output and decides whether to query the cloud or request a rescan.
3. **AWS Backend:** A serverless approach ensures zero cost when idle and high scalability. Student uploads are stored in an S3 bucket with a 1-day lifecycle policy to enforce privacy.
