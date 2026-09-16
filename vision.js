// Study-Smart Vision: OpenCV Preprocessing Pipeline
// Powered by OpenCV.js

const VisionSystem = {
    isReady: false,

    init() {
        if (cv.getBuildInformation) {
            this.isReady = true;
            console.log("Study-Smart Vision (OpenCV) Initialized");
        } else {
            // Wait for OpenCV to load
            cv['onRuntimeInitialized'] = () => {
                this.isReady = true;
                console.log("Study-Smart Vision (OpenCV) Initialized");
            };
        }
    },

    /**
     * Assesses the quality of an image for OCR/Learning Extraction.
     * Checks Blur (Laplacian Variance) and Lighting (Mean value).
     */
    assessQuality(imageElement) {
        if (!this.isReady) throw new Error("OpenCV not ready");

        let mat = cv.imread(imageElement);
        let gray = new cv.Mat();
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);

        // 1. Check Blur (Laplacian Variance)
        let lap = new cv.Mat();
        cv.Laplacian(gray, lap, cv.CV_64F, 1, 1, 0, cv.BORDER_DEFAULT);
        let mean = new cv.Mat();
        let stdDev = new cv.Mat();
        cv.meanStdDev(lap, mean, stdDev);
        let blurScore = stdDev.doubleAt(0, 0) * stdDev.doubleAt(0, 0);

        // 2. Check Lighting
        let lightingMean = new cv.Mat();
        let lightingStdDev = new cv.Mat();
        cv.meanStdDev(gray, lightingMean, lightingStdDev);
        let lightScore = lightingMean.doubleAt(0, 0);

        // Determine quality
        let isBlurred = blurScore < 100; // Threshold can be tuned
        let isTooDark = lightScore < 50;
        let isTooBright = lightScore > 240;

        let qualityScore = 100;
        if (isBlurred) qualityScore -= 40;
        if (isTooDark) qualityScore -= 30;
        if (isTooBright) qualityScore -= 30;

        mat.delete();
        gray.delete();
        lap.delete();
        mean.delete();
        stdDev.delete();
        lightingMean.delete();
        lightingStdDev.delete();

        return {
            qualityScore: Math.max(0, qualityScore),
            blurScore: blurScore,
            lightingScore: lightScore,
            isBlurred: isBlurred,
            isTooDark: isTooDark,
            isTooBright: isTooBright,
            confidence: qualityScore / 100
        };
    },

    /**
     * Detects document boundaries, applies perspective transform, and cleans the image.
     */
    processDocument(imageElement, outputCanvas) {
        if (!this.isReady) throw new Error("OpenCV not ready");

        let src = cv.imread(imageElement);
        let dst = new cv.Mat();
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // Edge detection
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        let edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200, 3, false);

        // Find contours
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let maxContourIndex = -1;
        let docContour = null;

        for (let i = 0; i < contours.size(); ++i) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);
            if (area > 5000) {
                let peri = cv.arcLength(contour, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(contour, approx, 0.02 * peri, true);
                
                if (approx.rows === 4 && area > maxArea) {
                    maxArea = area;
                    maxContourIndex = i;
                    if (docContour) docContour.delete();
                    docContour = approx.clone();
                }
                approx.delete();
            }
            contour.delete();
        }

        let documentDetected = false;
        let perspectiveCorrected = false;

        if (docContour) {
            documentDetected = true;
            // For now, if a document is detected, we do a basic perspective transform.
            // Sorting points (top-left, top-right, bottom-right, bottom-left) is required for true warpPerspective.
            // As a simplified fallback for this demonstration, we'll draw the contour and just apply Adaptive Thresholding to the whole image.
            
            // Draw contour for feedback
            let color = new cv.Scalar(0, 255, 0, 255);
            cv.drawContours(src, contours, maxContourIndex, color, 3, cv.LINE_8, hierarchy, 0);
            
            // To do proper warp, we need to sort docContour points. We will implement robust point sorting in a future refinement.
            // Let's just enhance the whole image for readability.
            let enhanced = new cv.Mat();
            cv.adaptiveThreshold(gray, enhanced, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
            cv.imshow(outputCanvas, enhanced);
            enhanced.delete();
            perspectiveCorrected = false; // We didn't do full warp yet
        } else {
            // No document detected, just output original
            cv.imshow(outputCanvas, src);
        }

        src.delete();
        dst.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        if (docContour) docContour.delete();

        return {
            documentDetected: documentDetected,
            perspectiveCorrected: perspectiveCorrected
        };
    }
};

window.VisionSystem = VisionSystem;
