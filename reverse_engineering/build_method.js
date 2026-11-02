const fs = require('fs');

const source = fs.readFileSync('method_source.html', 'utf8');

let html = source;

// Strip old Next.js css & js tags
html = html.replace(/<link rel="stylesheet" href="\/_next\/static\/css\/[^"]+"[^>]*>/g, '');
html = html.replace(/<link rel="preload"[^>]*>/g, '');
html = html.replace(/<script src="\/_next\/static\/chunks\/[^"]+"[^>]*><\/script>/g, '');
html = html.replace(/<script>\(self\.__next_f[\s\S]*?<\/script>/g, '');

const headExtra = `
  <link rel="stylesheet" href="/css/styles.css" />
  <script src="/js/bxd-engine.js" defer></script>
  <script src="/js/main.js" defer></script>
  <script src="/js/method-app.js" defer></script>
  <style>
    .v2-step-item.completed .v2-step-circle {
      background: #22c55e !important;
      border-color: #22c55e !important;
      color: #fff !important;
    }
    .v2-step-line.active {
      background: linear-gradient(90deg, #22c55e, #a855f7) !important;
    }
    .drag-active {
      border-color: #c084fc !important;
      background: rgba(168, 85, 247, 0.15) !important;
    }
    .process-terminal {
      display: none;
      margin-top: 18px;
      background: #090613;
      border: 1px solid rgba(168, 85, 247, 0.35);
      border-radius: 12px;
      padding: 14px 18px;
      font-family: monospace;
      font-size: 0.84rem;
      color: #e2e8f0;
      max-height: 180px;
      overflow-y: auto;
      text-align: left;
    }
    .terminal-line {
      margin-bottom: 4px;
      line-height: 1.4;
      color: #c084fc;
    }
    .terminal-line:last-child {
      color: #4ade80;
      font-weight: bold;
    }
    .video-preview-player {
      width: 100%;
      max-height: 380px;
      border-radius: 14px;
      background: #000;
      margin: 16px 0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
  </style>
`;

html = html.replace('</head>', `${headExtra}</head>`);
html = html.replace(/src="\/logo\.png"/g, 'src="/assets/logo.png"');
html = html.replace(/href="\/favicon\.ico"/g, 'href="/assets/favicon.ico"');
html = html.replace('<canvas style="position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.95"></canvas>', '<canvas class="ambient-canvas" style="position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.95"></canvas>');

// Replace the static card inside v2-main-card with our interactive step containers
const targetCard = `<div class="v2-main-card">`;
const interactiveCardContent = `
<div class="v2-main-card">
  <!-- Hidden File Input -->
  <input type="file" id="fileInput" accept="video/mp4,video/quicktime,video/mov,.mkv,.webm" style="display:none" />

  <!-- STEP 1: Video Selection -->
  <div id="step1Container">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, #c084fc 0%, #a855f7 100%);color:#ffffff;font-size:1rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(168, 85, 247, 0.4)">1</div>
      <div>
        <h2 style="font-size:1.25rem;font-weight:800;color:#ffffff;margin:0">Choose your video</h2>
        <p style="font-size:0.82rem;color:#94a3b8;margin:0">Every common video format is supported (.mp4, .mov)</p>
      </div>
    </div>
    <div class="v2-simple-dropzone" id="dropzone" style="cursor:pointer">
      <div class="v2-plus-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <div style="font-size:1.05rem;font-weight:800;color:#ffffff;margin-bottom:6px">Select video</div>
      <div style="font-size:0.82rem;color:#64748b">or drag and drop your file here</div>
    </div>
  </div>

  <!-- STEP 2: Method Configuration & Processing -->
  <div id="step2Container" style="display:none">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, #c084fc 0%, #a855f7 100%);color:#ffffff;font-size:1rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(168, 85, 247, 0.4)">2</div>
      <div>
        <h2 style="font-size:1.25rem;font-weight:800;color:#ffffff;margin:0">Video Loaded &amp; Method Ready</h2>
        <p style="font-size:0.82rem;color:#94a3b8;margin:0">Container inspection completed. Ready to apply 120FPS timescale patch.</p>
      </div>
    </div>
    
    <div style="background:rgba(255, 255, 255, 0.03);border:1px solid rgba(255, 255, 255, 0.1);border-radius:16px;padding:20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-weight:700;color:#ffffff;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px" id="metaFileName">video.mp4</div>
        <button type="button" id="changeVideoBtn" style="background:none;border:none;color:#c084fc;cursor:pointer;font-size:0.82rem;font-weight:700">Change video</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:12px;text-align:center">
        <div style="background:rgba(0, 0, 0, 0.35);padding:10px;border-radius:10px">
          <div style="color:#64748b;font-size:0.75rem;margin-bottom:4px">File Size</div>
          <div style="color:#e2e8f0;font-weight:700;font-size:0.9rem" id="metaFileSize">--</div>
        </div>
        <div style="background:rgba(0, 0, 0, 0.35);padding:10px;border-radius:10px">
          <div style="color:#64748b;font-size:0.75rem;margin-bottom:4px">Resolution</div>
          <div style="color:#e2e8f0;font-weight:700;font-size:0.9rem" id="metaResolution">--</div>
        </div>
        <div style="background:rgba(0, 0, 0, 0.35);padding:10px;border-radius:10px">
          <div style="color:#64748b;font-size:0.75rem;margin-bottom:4px">Duration</div>
          <div style="color:#e2e8f0;font-weight:700;font-size:0.9rem" id="metaDuration">--</div>
        </div>
        <div style="background:rgba(0, 0, 0, 0.35);padding:10px;border-radius:10px">
          <div style="color:#64748b;font-size:0.75rem;margin-bottom:4px">Container Mode</div>
          <div style="color:#4ade80;font-weight:700;font-size:0.9rem" id="metaTimescale">120 FPS Ready</div>
        </div>
      </div>
    </div>

    <button type="button" id="processBtn" class="primary-action-btn" style="width:100%;padding:16px;font-size:1.05rem;border-radius:14px;cursor:pointer;justify-content:center;gap:10px">
      <span>✨ Apply Method &amp; Restructure Container</span>
    </button>

    <div class="process-terminal" id="processTerminal">
      <div id="terminalLogs"></div>
    </div>
  </div>

  <!-- STEP 3: Download & Preview -->
  <div id="step3Container" style="display:none;text-align:center">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(34, 197, 94, 0.12);border:1px solid rgba(34, 197, 94, 0.3);border-radius:20px;padding:6px 14px;color:#4ade80;font-weight:700;font-size:0.85rem;margin-bottom:14px">
      <span>✓ Video Successfully Optimized</span>
    </div>
    <h2 style="font-size:1.6rem;font-weight:800;color:#ffffff;margin-bottom:8px">Ready for TikTok Web</h2>
    <p style="color:#94a3b8;font-size:0.9rem;margin-bottom:16px">Moov atom and 120FPS timing scales patched losslessly without re-encoding.</p>

    <video id="previewVideo" class="video-preview-player" controls autoplay loop muted></video>

    <div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;font-size:0.85rem;color:#94a3b8">
      <span>File: <strong style="color:#e2e8f0" id="downloadFileName">optimized.mp4</strong></span>
      <span>•</span>
      <span>Size: <strong style="color:#e2e8f0" id="downloadFileSize">--</strong></span>
    </div>

    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px">
      <a id="downloadBtn" class="primary-action-btn" style="padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;color:#fff;display:inline-flex;align-items:center;gap:8px" href="#">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Download Enhanced Video (.mp4)</span>
      </a>
      <button type="button" id="resetBtn" style="padding:14px 22px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#f8fafc;font-weight:600;cursor:pointer">
        Process Another Video
      </button>
    </div>
  </div>
`;

// Replace until the closing div of v2-main-card
const endTarget = `• Video processing stays on this device. Your source video is never uploaded to any server.</div></div></div>`;
const startIdx = html.indexOf(targetCard);
const endIdx = html.indexOf(endTarget);

if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + interactiveCardContent + `\n<div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255, 255, 255, 0.05);text-align:center;font-size:0.74rem;color:#64748b;line-height:1.4">• Video processing stays on this device. Your source video is never uploaded to any server.</div></div></div>` + html.substring(endIdx + endTarget.length);
}

fs.writeFileSync('public/method.html', html);
console.log('Generated public/method.html successfully');
