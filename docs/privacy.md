# Privacy-First Architecture

## Guiding Principles
Educational notes can contain highly sensitive and personal information. Study-Smart Vision is designed to protect this data.

## Implementation Details
1. **Local Priority:** OpenCV preprocessing happens locally in the browser. Unusable images are rejected before ever touching the network.
2. **No Persistent Cloud Storage:** Images uploaded to AWS S3 are placed in a temporary bucket configured with a 1-day lifecycle deletion policy.
3. **Local Encryption:** All generated flashcards and study schedules are saved to localStorage and protected by AES-GCM encryption with a PBKDF2 derived key (configured in security.js).
4. **Data Minimization:** We only upload compressed, cropped, and thresholded images, discarding unnecessary background information.
