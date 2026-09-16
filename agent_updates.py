import re

with open('agent.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_logic = """
// Extended Agent Logic
let scanMode = 'single';
let semesterDocuments = [];
let pendingSemester = null;

function setScanMode(mode) {
    scanMode = mode;
    document.getElementById('mode-single-scan').className = mode === 'single' ? 'btn btn-primary flex-1' : 'btn btn-secondary flex-1';
    document.getElementById('mode-build-semester').className = mode === 'semester' ? 'btn btn-primary flex-1' : 'btn btn-secondary flex-1';
    
    document.getElementById('document-queue-container').style.display = mode === 'semester' ? 'block' : 'none';
    document.getElementById('btn-analyze-semester').style.display = mode === 'semester' && semesterDocuments.length > 0 ? 'block' : 'none';
    document.getElementById('btn-scan').innerText = mode === 'semester' ? 'Add to Semester' : 'Process Image';
}

async function handleImageUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        if (currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
            document.getElementById('video-feed').style.display = 'none';
        }
        
        const preview = document.getElementById('image-preview');
        const placeholder = document.getElementById('camera-placeholder');
        const btnScan = document.getElementById('btn-scan');
        document.getElementById('cloud-consent-msg').style.display = 'block';
        
        // Load first image into preview
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            btnScan.style.display = 'block';
        };
        reader.readAsDataURL(files[0]);
        
        // If multi-upload in semester mode, add them all sequentially
        if (scanMode === 'semester' && files.length > 1) {
            for (let i = 0; i < files.length; i++) {
                // Read and enqueue (In real app, we'd process sequentially to save memory)
                // For demo, we just add metadata to the queue and rely on the preview logic
            }
        }
    }
}

// Override performScan for transactional handling
async function performScan() {
    if (!VisionSystem.isReady) {
        alert("OpenCV is still loading...");
        return;
    }
    
    const video = document.getElementById('video-feed');
    const preview = document.getElementById('image-preview');
    const visionCanvas = document.getElementById('vision-canvas');
    const outputCanvas = document.getElementById('output-canvas');
    
    const ctx = visionCanvas.getContext('2d', { willReadFrequently: true });
    
    if (video.style.display === 'block') {
        visionCanvas.width = video.videoWidth;
        visionCanvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, visionCanvas.width, visionCanvas.height);
    } else if (preview.style.display === 'block') {
        visionCanvas.width = preview.naturalWidth;
        visionCanvas.height = preview.naturalHeight;
        ctx.drawImage(preview, 0, 0, visionCanvas.width, visionCanvas.height);
    } else {
        alert("No image source available.");
        return;
    }
    
    // Check quality locally with OpenCV
    const quality = VisionSystem.assessQuality(visionCanvas);
    const docResult = VisionSystem.processDocument(visionCanvas, outputCanvas);
    
    // Display metrics
    document.getElementById('agent-trace-list').innerHTML = '';
    document.getElementById('extraction-results').style.display = 'block';
    addTrace(OpenCV Processing: Local);
    addTrace(Quality Score: \/100);
    addTrace(Document Detected: \);
    
    if (quality.isBlurred) {
        VisionAgent.showUserFeedback("Image is too blurred. Please rescan.");
        return;
    }
    
    // Store processed image in IndexedDB
    const processedBase64 = outputCanvas.toDataURL('image/jpeg', 0.7); // compress
    const docId = 'doc_' + Date.now();
    await storeImage(docId, processedBase64);
    
    if (scanMode === 'semester') {
        semesterDocuments.push({ id: docId, quality, docResult });
        updateDocumentQueue();
        VisionAgent.showUserFeedback("Document added to semester.");
        document.getElementById('btn-analyze-semester').style.display = 'block';
    } else {
        await VisionAgent.processScan(visionCanvas, outputCanvas);
    }
}

function updateDocumentQueue() {
    const list = document.getElementById('document-queue');
    list.innerHTML = '';
    semesterDocuments.forEach((doc, i) => {
        const li = document.createElement('li');
        li.style.padding = '5px';
        li.innerText = Document \: Quality \/100;
        list.appendChild(li);
    });
}

async function analyzeSemester() {
    VisionAgent.showUserFeedback("Analyzing semester documents in cloud...");
    
    // Sequential mock cloud analysis
    let extractedModules = [];
    for (let doc of semesterDocuments) {
        // AWS Simulated delay
        await new Promise(r => setTimeout(r, 1000));
        extractedModules.push({
            name: "Data Networks",
            code: "CSN301",
            assessments: [{ name: "Test 2", date: "16 October 2026", confidence: 61 }]
        });
    }
    
    // Resolve duplicates & uncertainty (Transactional Phase F & L)
    pendingSemester = {
        university: { name: "University of Cape Town", country: "South Africa", confidence: 98 },
        modules: extractedModules
    };
    
    renderSemesterReview();
}

function renderSemesterReview() {
    const container = document.getElementById('agent-trace-list');
    container.innerHTML = 
        <h3 class="font-semibold text-lg mt-2 mb-2">Review Your Semester</h3>
        <p><strong>University:</strong> \</p>
        <p><strong>Modules:</strong> \</p>
    ;
    
    const uncert = pendingSemester.modules[0].assessments[0];
    if (uncert.confidence < 80) {
        container.innerHTML += 
            <div class="alert alert-warning mt-2" style="padding:10px;">
               <strong>Study-Smart isn't confident about this assessment date.</strong><br>
               Detected: \ (Confidence: \%)<br>
               <input type="text" class="form-input mt-2" value="\" id="confirm-date">
            </div>
        ;
    }
    
    document.getElementById('btn-approve-plan').innerText = 'Confirm Semester';
    document.getElementById('btn-approve-plan').onclick = commitSemester;
}

function commitSemester() {
    if (!pendingSemester) return;
    
    // Apply updates
    if (window.appState) {
        // Add modules to appState
        pendingSemester.modules.forEach(m => {
            appState.modules.push({ id: Date.now().toString(), code: m.code, name: m.name, color: '#10B981' });
        });
        
        saveState();
        if (typeof renderModules === 'function') renderModules();
        
        alert("Semester committed successfully!");
        
        // Reset
        semesterDocuments = [];
        pendingSemester = null;
        updateDocumentQueue();
        document.getElementById('extraction-results').style.display = 'none';
        document.getElementById('btn-analyze-semester').style.display = 'none';
    }
}
"""

content = content + new_logic
with open('agent.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Agent UI updated.")
