// Study-Smart Vision: OpenCV Preprocessing Pipeline (runs entirely on the device)
// Powered by OpenCV.js

const VisionSystem = {
    isReady: false,
    MAX_SIDE: 1600, // downscale large photos first: bounds CPU time and memory

    /** Waits for opencv.js (loaded async) without needing an inline onload handler. */
    init() {
        if (this._initStarted) return;
        this._initStarted = true;
        const started = Date.now();
        const markReady = () => {
            this.isReady = true;
            document.dispatchEvent(new CustomEvent('studysmart:vision-ready'));
            console.log('Study-Smart Vision (OpenCV) initialised');
        };
        const poll = () => {
            const cvGlobal = window.cv;
            if (cvGlobal && typeof cvGlobal.then === 'function') {
                // Newer builds expose a promise-like module.
                cvGlobal.then((mod) => { window.cv = mod; markReady(); });
                return;
            }
            if (cvGlobal && cvGlobal.Mat) {
                markReady();
                return;
            }
            if (cvGlobal && !cvGlobal.Mat && !cvGlobal.__srHooked) {
                cvGlobal.__srHooked = true;
                cvGlobal.onRuntimeInitialized = markReady;
            }
            if (Date.now() - started < 60000) {
                setTimeout(poll, 250);
            } else {
                console.warn('OpenCV did not load; Smart Scan is unavailable.');
            }
        };
        poll();
    },

    /** Returns a cv.Mat of the source, downscaled so the longest side <= MAX_SIDE. */
    _readScaled(imageElement) {
        const src = cv.imread(imageElement);
        const longest = Math.max(src.cols, src.rows);
        if (longest <= this.MAX_SIDE) return src;
        const scale = this.MAX_SIDE / longest;
        const dst = new cv.Mat();
        cv.resize(src, dst, new cv.Size(Math.round(src.cols * scale), Math.round(src.rows * scale)), 0, 0, cv.INTER_AREA);
        src.delete();
        return dst;
    },

    /**
     * Assesses the quality of an image for reading.
     * Checks blur (variance of the Laplacian) and lighting (mean brightness).
     */
    assessQuality(imageElement) {
        if (!this.isReady) throw new Error("OpenCV not ready");

        let mat = this._readScaled(imageElement);
        let gray = new cv.Mat();
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);

        let lap = new cv.Mat();
        cv.Laplacian(gray, lap, cv.CV_64F, 1, 1, 0, cv.BORDER_DEFAULT);
        let mean = new cv.Mat();
        let stdDev = new cv.Mat();
        cv.meanStdDev(lap, mean, stdDev);
        let blurScore = stdDev.doubleAt(0, 0) * stdDev.doubleAt(0, 0);

        let lightingMean = new cv.Mat();
        let lightingStdDev = new cv.Mat();
        cv.meanStdDev(gray, lightingMean, lightingStdDev);
        let lightScore = lightingMean.doubleAt(0, 0);

        let isBlurred = blurScore < 100; // threshold can be tuned
        let isTooDark = lightScore < 50;
        let isTooBright = lightScore > 240;

        let qualityScore = 100;
        if (isBlurred) qualityScore -= 40;
        if (isTooDark) qualityScore -= 30;
        if (isTooBright) qualityScore -= 30;

        [mat, gray, lap, mean, stdDev, lightingMean, lightingStdDev].forEach(m => m.delete());

        return {
            qualityScore: Math.max(0, qualityScore),
            blurScore,
            lightingScore: lightScore,
            isBlurred,
            isTooDark,
            isTooBright,
        };
    },

    /** Orders 4 corner points as top-left, top-right, bottom-right, bottom-left. */
    _orderCorners(points) {
        const sums = points.map(p => p.x + p.y);
        const diffs = points.map(p => p.y - p.x);
        const tl = points[sums.indexOf(Math.min(...sums))];
        const br = points[sums.indexOf(Math.max(...sums))];
        const tr = points[diffs.indexOf(Math.min(...diffs))];
        const bl = points[diffs.indexOf(Math.max(...diffs))];
        return [tl, tr, br, bl];
    },

    /**
     * Detects the page outline, straightens it (perspective correction) and
     * writes a clean greyscale version to outputCanvas.
     */
    processDocument(imageElement, outputCanvas) {
        if (!this.isReady) throw new Error("OpenCV not ready");

        let src = this._readScaled(imageElement);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        let edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200, 3, false);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        const minArea = 0.2 * src.cols * src.rows; // the page should fill a good part of the photo
        let maxArea = 0;
        let corners = null;

        for (let i = 0; i < contours.size(); ++i) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);
            if (area > minArea && area > maxArea) {
                let peri = cv.arcLength(contour, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(contour, approx, 0.02 * peri, true);
                if (approx.rows === 4 && cv.isContourConvex(approx)) {
                    maxArea = area;
                    corners = [];
                    for (let j = 0; j < 4; j++) {
                        corners.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
                    }
                }
                approx.delete();
            }
            contour.delete();
        }

        let documentDetected = false;
        let perspectiveCorrected = false;

        if (corners) {
            documentDetected = true;
            const [tl, tr, br, bl] = this._orderCorners(corners);
            const width = Math.round(Math.max(Math.hypot(br.x - bl.x, br.y - bl.y), Math.hypot(tr.x - tl.x, tr.y - tl.y)));
            const height = Math.round(Math.max(Math.hypot(tr.x - br.x, tr.y - br.y), Math.hypot(tl.x - bl.x, tl.y - bl.y)));
            if (width > 50 && height > 50) {
                let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
                let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]);
                let M = cv.getPerspectiveTransform(srcTri, dstTri);
                let warped = new cv.Mat();
                cv.warpPerspective(gray, warped, M, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
                cv.imshow(outputCanvas, warped);
                [srcTri, dstTri, M, warped].forEach(m => m.delete());
                perspectiveCorrected = true;
            }
        }
        if (!perspectiveCorrected) {
            // No clear page outline: keep the whole photo, in greyscale.
            cv.imshow(outputCanvas, gray);
        }

        [src, gray, blurred, edges, contours, hierarchy].forEach(m => m.delete());

        return { documentDetected, perspectiveCorrected };
    }
};

window.VisionSystem = VisionSystem;
VisionSystem.init();
