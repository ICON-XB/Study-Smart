# Privacy-first architecture

The user-facing Privacy Notice is `privacy.html`, generated from `legal-src/privacy.md`. This page summarises the technical design.

1. **Local priority.** OpenCV preprocessing runs in the browser. Blurry or dark photos are rejected before anything else happens.
2. **No Study-Smart cloud.** There is no Study-Smart server for study data. The earlier AWS S3 upload design was never used by the app and has been removed from `aws/template.yaml`.
3. **Local encryption.** Study data (localStorage) and scans (IndexedDB) are encrypted with AES-GCM. The key comes from the PIN via PBKDF2 (310,000 iterations) followed by HKDF. A separate HKDF output is stored as the PIN check value, so it cannot decrypt data. Data from older versions, where the stored hash doubled as the key, is re-encrypted on the first unlock.
4. **Optional AI with the user's own key.** AI features send the cleaned image or the typed text directly to Google Gemini, and only after the user agrees. Google's free tier may use this data to improve its products; the in-app notice says so.
5. **Data minimisation.** Scans are downscaled (longest side 1,600 px), straightened and converted to greyscale before storage or AI use. Backups never contain the Gemini key.
