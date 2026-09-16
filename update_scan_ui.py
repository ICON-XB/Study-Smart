import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Smart Scan left side content
new_left = """<!-- Left Side: Scanner & Build My Semester -->
            <div class="glass-card flex-column" style="overflow-y: auto;">
              <div class="card-header border-bottom pb-4 mb-4">
                <h2 class="card-title">Study-Smart Vision</h2>
                <p class="text-sm text-muted">See it. Understand it. Master it.</p>
              </div>
              <div class="flex-1 flex-column" style="gap: 15px;">
                <!-- Build My Semester Mode Toggle -->
                <div class="flex-row gap-2 mb-2">
                   <button class="btn btn-primary flex-1" id="mode-single-scan" onclick="setScanMode('single')">Quick Scan</button>
                   <button class="btn btn-secondary flex-1" id="mode-build-semester" onclick="setScanMode('semester')">Build My Semester</button>
                </div>
                
                <div id="video-container" style="position: relative; width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                  <span id="camera-placeholder" style="color: #666;">Camera Feed / Image Preview</span>
                  <video id="video-feed" autoplay playsinline style="display: none; width: 100%; height: 100%; object-fit: cover;"></video>
                  <img id="image-preview" style="display: none; width: 100%; height: 100%; object-fit: contain;" />
                  <canvas id="vision-canvas" style="display: none;"></canvas>
                </div>
                
                <!-- Multi-document queue (only visible in Build My Semester) -->
                <div id="document-queue-container" style="display: none;">
                   <h4 class="text-sm font-semibold mb-2">Semester Documents</h4>
                   <ul id="document-queue" style="list-style: none; padding: 0; font-size: 13px; max-height: 100px; overflow-y: auto; background: var(--color-background); border-radius: 4px; border: 1px solid var(--color-border); padding: 5px;">
                      <li style="color: var(--color-text-muted); padding: 5px;">No documents added yet.</li>
                   </ul>
                </div>

                <div class="flex-row gap-2">
                  <button class="btn btn-secondary flex-1" id="btn-camera" onclick="startCamera()">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Start Camera
                  </button>
                  <button class="btn btn-secondary flex-1" id="btn-upload" onclick="document.getElementById('file-upload').click()">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Image
                  </button>
                  <input type="file" id="file-upload" accept="image/*" style="display: none;" onchange="handleImageUpload(event)" multiple>
                </div>

                <div class="flex-row gap-2">
                  <button class="btn btn-primary flex-1" id="btn-scan" onclick="performScan()" style="display: none;">Process Image</button>
                  <button class="btn btn-success flex-1" id="btn-analyze-semester" onclick="analyzeSemester()" style="display: none;">Analyze Semester</button>
                </div>
                
                <!-- Cloud processing disclaimer -->
                <p id="cloud-consent-msg" class="text-xs text-muted mt-2" style="display: none;">By processing, you consent to securely analyze this document in the Study-Smart cloud (AWS). Processed images are ephemeral and auto-deleted.</p>

                <div id="agent-feedback" class="alert alert-info mt-3" style="display: none; padding: 10px; border-radius: 6px; font-size: 14px;"></div>
              </div>
            </div>"""

content = re.sub(r'<!-- Left Side: Scanner -->.*?<div id="agent-feedback"', new_left + '\n                <div id="agent-feedback"', content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI updated.")
