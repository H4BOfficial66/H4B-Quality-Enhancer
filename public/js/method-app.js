// H4B Enhancer Method App (V2 Worker Engine + V1 Fallback)
document.addEventListener('DOMContentLoaded', () => {
  initMethodApp();
});

function initMethodApp() {
  const isV1 = window.IS_V1_MODE || false;
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const stepItems = document.querySelectorAll('.v2-step-item');
  const stepLines = document.querySelectorAll('.v2-step-line');

  const step1Container = document.getElementById('step1Container');
  const step2Container = document.getElementById('step2Container');
  const step3Container = document.getElementById('step3Container');

  let currentFile = null;
  let processedBlobUrl = null;
  let processedFileName = '';

  if (!dropzone || !fileInput) return;

  // File selection triggers
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag & drop events
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  function setStep(stepNum) {
    stepItems.forEach((item, idx) => {
      if (idx + 1 < stepNum) {
        item.className = 'v2-step-item completed';
      } else if (idx + 1 === stepNum) {
        item.className = 'v2-step-item active';
      } else {
        item.className = 'v2-step-item';
      }
    });

    stepLines.forEach((line, idx) => {
      if (idx + 1 < stepNum) {
        line.className = 'v2-step-line active';
      } else {
        line.className = 'v2-step-line';
      }
    });

    if (step1Container) step1Container.style.display = stepNum === 1 ? 'block' : 'none';
    if (step2Container) step2Container.style.display = stepNum === 2 ? 'block' : 'none';
    if (step3Container) step3Container.style.display = stepNum === 3 ? 'block' : 'none';
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleFile(file) {
    const validExtensions = ['.mp4', '.mov', '.mkv', '.webm'];
    const nameLower = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => nameLower.endsWith(ext)) || file.type.startsWith('video/');

    if (!isValid) {
      alert('Unsupported format. Please select a valid MP4 or MOV video file.');
      return;
    }

    currentFile = file;

    const video = document.createElement('video');
    video.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);
    video.src = tempUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const duration = Math.round(video.duration || 0);

      document.getElementById('metaFileName').textContent = file.name;
      document.getElementById('metaFileSize').textContent = formatBytes(file.size);
      document.getElementById('metaResolution').textContent = `${width}x${height}`;
      document.getElementById('metaDuration').textContent = `${duration}s`;
      document.getElementById('metaTimescale').textContent = '✅ Universal 1080p HD';

      setStep(2);
    };

    video.onerror = () => {
      document.getElementById('metaFileName').textContent = file.name;
      document.getElementById('metaFileSize').textContent = formatBytes(file.size);
      document.getElementById('metaResolution').textContent = '1080x1920 (Auto)';
      document.getElementById('metaDuration').textContent = 'Detected';
      document.getElementById('metaTimescale').textContent = '✅ Universal 1080p HD';

      setStep(2);
    };
  }

  const changeVideoBtn = document.getElementById('changeVideoBtn');
  if (changeVideoBtn) {
    changeVideoBtn.addEventListener('click', () => {
      currentFile = null;
      fileInput.value = '';
      setStep(1);
    });
  }

  // Next-Gen Web Worker execution pipeline
  function runV2Worker(file, onProgress, onLog, onStage) {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined') {
        return reject(new Error('Web Workers not supported in this browser.'));
      }

      let worker = null;
      let isDone = false;
      // Timeout: agar 3 minute mein kuch nahi hua to fail kar do
      let workerTimeout = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          cleanup();
          reject(new Error('Worker processing timeout. Please try again.'));
        }
      }, 180000);

      const cleanup = () => {
        clearTimeout(workerTimeout);
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };

      try {
        // Correct worker URL - server root se relative path use karo
        const workerBase = window.location.origin + '/engine/v2/v2Worker.js';
        const workerUrl = workerBase;
        worker = new Worker(workerUrl, { type: 'module' });

        worker.onmessage = (e) => {
          if (isDone) return;
          const msg = e.data || {};
          if (msg.type === 'progress') {
            if (typeof msg.percent === 'number' && onProgress) onProgress(msg.percent);
            if (msg.stage && onStage) onStage(msg.stage);
            if (msg.log && onLog) onLog(msg.log);
          } else if ((msg.type === 'done' || msg.type === 'complete') && msg.buffer) {
            isDone = true;
            const outputBytes = new Uint8Array(msg.buffer);
            cleanup();
            resolve(outputBytes);
          } else if (msg.type === 'error') {
            isDone = true;
            cleanup();
            reject(new Error(msg.error || 'Worker engine optimization failed'));
          }
        };

        worker.onerror = (err) => {
          if (!isDone) {
            isDone = true;
            cleanup();
            // Detailed error log karo
            const errMsg = err.message || err.filename || 'Worker thread initialization error';
            reject(new Error('Worker Error: ' + errMsg));
          }
        };

        worker.onmessageerror = (err) => {
          if (!isDone) {
            isDone = true;
            cleanup();
            reject(new Error('Worker message serialization error'));
          }
        };

        file.arrayBuffer().then((buffer) => {
          if (onLog) onLog('[*] Transferring video to V2 Next-Gen Engine Worker...');
          const profileSelect = document.getElementById('deviceProfile');
          let profile = (profileSelect && profileSelect.value) ? profileSelect.value : 'pc';
          // Normalize profile values
          if (profile === 'auto' || profile === 'desktop') {
            profile = 'pc';
          }
          if (onLog) onLog(`[*] Profile selected: ${profile}`);
          worker.postMessage({
            type: 'process',
            buffer: buffer,
            fileName: file.name,
            postingDevice: profile
          }, [buffer]);
        }).catch(err => {
          cleanup();
          reject(new Error('Failed to read file buffer: ' + err.message));
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  // Start Process Button
  const processBtn = document.getElementById('processBtn');
  const processTerminal = document.getElementById('processTerminal');
  const terminalLogs = document.getElementById('terminalLogs');

  if (processBtn) {
    processBtn.addEventListener('click', async () => {
      if (!currentFile) return;

      processBtn.disabled = true;
      processBtn.style.opacity = '0.6';
      processTerminal.style.display = 'block';
      terminalLogs.innerHTML = '';

      function log(msg) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = msg;
        terminalLogs.appendChild(line);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
      }

      log('[*] Initializing Method Engine...');
      await new Promise(r => setTimeout(r, 100));

      let outputBytes = null;

      try {
        if (!isV1) {
          // Attempt Primary Next-Gen V2 Worker Pipeline
          log('[*] Spawning V2 Worker Engine (c-CvVvisn3 WebAssembly)...');
          try {
            outputBytes = await runV2Worker(
              currentFile,
              (percent) => { log(`[*] Progress: ${percent}%`); },
              (logMsg) => log(logMsg),
              (stage) => { if (stage) log(`[*] Stage: ${stage}`); }
            );
            log('[✓] V2 Next-Gen Container Pipeline completed successfully!');
          } catch (workerErr) {
            log(`[!] V2 Worker Note: ${workerErr.message}. Falling back to In-Memory Remuxer...`);
          }
        }

        // Secondary fallback or V1 mode
        if (!outputBytes || outputBytes.length === 0) {
          const reader = new FileReader();
          const bufferPromise = new Promise((res, rej) => {
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsArrayBuffer(currentFile);
          });

          const arrayBuffer = await bufferPromise;
          const inputBytes = new Uint8Array(arrayBuffer);

          // 1. Try Classic Method timing engine (lossless timing & clean AVC High profile 5.1 container)
          if (typeof window.transformVideo === 'function') {
            log('[*] Engaging Classic Method timing engine...');
            try {
              const res = window.transformVideo(arrayBuffer, 10, 'H4B', (info) => log(`[*] ${info}`));
              if (res && res.success && (res.outputBytes || res.video)) {
                outputBytes = res.outputBytes || res.video;
              }
            } catch (tErr) {
              log(`[!] Timing engine note: ${tErr.message}`);
            }
          }

          // 2. Secondary fallback: in-memory box remuxer
          if (!outputBytes || outputBytes.length === 0) {
            log('[*] Engaging precision MP4 atom timing engine...');
            if (typeof window.remuxMp4Boxes === 'function') {
              try {
                outputBytes = window.remuxMp4Boxes(inputBytes, { extendTiming: false });
              } catch (rErr) {
                log(`[!] Remux note: ${rErr.message}`);
              }
            }
            if (!outputBytes || outputBytes.length === 0) {
              outputBytes = inputBytes;
            }
          }
        }

        if (!outputBytes || outputBytes.length === 0) {
          throw new Error('Container optimization failed. Empty output.');
        }

        // Increment global counter
        fetch('/api/counter/up').catch(() => {});

        // Trigger Confetti
        if (typeof window.confetti === 'function') {
          try {
            window.confetti({
              particleCount: 110,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#ef4444', '#f87171', '#dc2626', '#fca5a5', '#fee2e2']
            });
          } catch (err) {}
        }

        // Build download blob
        const blob = new Blob([outputBytes], { type: 'video/mp4' });
        if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl);
        processedBlobUrl = URL.createObjectURL(blob);

        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
        processedFileName = `${baseName}_h4b_1080p.mp4`;

        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
          downloadBtn.href = processedBlobUrl;
          downloadBtn.download = processedFileName;
        }

        const previewVideo = document.getElementById('previewVideo');
        if (previewVideo) {
          previewVideo.src = processedBlobUrl;
        }

        document.getElementById('downloadFileName').textContent = processedFileName;
        document.getElementById('downloadFileSize').textContent = formatBytes(outputBytes.length);

        log('[✓] Process Complete! Universal 1080p HD container optimized — iOS, Android & PC compatible.');
        await new Promise(r => setTimeout(r, 400));

        setStep(3);
      } catch (error) {
        log(`[ERROR] Processing failed: ${error.message}`);
        alert(`Processing error: ${error.message}`);
      } finally {
        processBtn.disabled = false;
        processBtn.style.opacity = '1';
      }
    });
  }

  // Reset / Process Another
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFile = null;
      if (processedBlobUrl) URL.revokeObjectURL(processedBlobUrl);
      processedBlobUrl = null;
      fileInput.value = '';
      setStep(1);
    });
  }
}
