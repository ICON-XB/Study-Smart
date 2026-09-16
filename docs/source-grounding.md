# Source-Grounded Intelligence

Study-Smart Vision preserves provenance for information generated from documents to maintain a high degree of academic trust.

## Implementation
When the Agentic Vision system generates a module, assessment, flashcard, or study recommendation, it attaches a sourceRef containing the ID of the scanned document.
Because these scanned images can be large (especially after multi-page "Build My Semester" scans), we do not store the Base64 images directly in localStorage alongside the metadata, as this would quickly exhaust browser storage limits.

Instead, images are stored in a local **IndexedDB** (StudySmartVisionDB), and the lightweight sourceRef in ppState simply references the IndexedDB key.

## View Source
When a student reviews an uncertain assessment date or an AI-generated flashcard, they can click **View Source**. Study-Smart will pull the original processed document from IndexedDB and display it, ensuring the student can always verify the AI's logic against the real-world syllabus or notes.
