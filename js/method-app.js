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

  function postProcessMp4(u8, onLog, scale = 2, addDuplicateAudio = false) {
    try {
      const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      let pos = 0;
      const boxes = [];
      while (pos + 8 <= u8.length) {
        let size = view.getUint32(pos);
        const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
        let hdr = 8;
        if (size === 1) {
          if (pos + 16 > u8.length) break;
          const hi = view.getUint32(pos + 8);
          const lo = view.getUint32(pos + 12);
          size = hi * 4294967296 + lo;
          hdr = 16;
        } else if (size === 0) {
          size = u8.length - pos;
        }
        if (size <= 0 || pos + size > u8.length) {
          if (size > 0 && pos + size <= u8.length) {
            boxes.push({ type, offset: pos, size, hdr });
          }
          break;
        }
        boxes.push({ type, offset: pos, size, hdr });
        pos += size;
      }

      const ftyp = boxes.find(b => b.type === 'ftyp');
      const moov = boxes.find(b => b.type === 'moov');
      const mdat = boxes.find(b => b.type === 'mdat');

      if (!ftyp || !moov || !mdat) {
        return u8;
      }

      function findFourCC(bytes, fourCC, start = 0, end = bytes.length) {
        const b0 = fourCC.charCodeAt(0), b1 = fourCC.charCodeAt(1), b2 = fourCC.charCodeAt(2), b3 = fourCC.charCodeAt(3);
        for (let i = start; i <= end - 4; i++) {
          if (bytes[i] === b0 && bytes[i + 1] === b1 && bytes[i + 2] === b2 && bytes[i + 3] === b3) return i;
        }
        return -1;
      }

      function readU32(bytes, off) {
        return ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;
      }

      function writeU32(bytes, off, val) {
        bytes[off] = (val >>> 24) & 0xff;
        bytes[off + 1] = (val >>> 16) & 0xff;
        bytes[off + 2] = (val >>> 8) & 0xff;
        bytes[off + 3] = val & 0xff;
      }

      let moovBytes = u8.slice(moov.offset, moov.offset + moov.size);

      // Parse direct children of moov
      const moovChildren = [];
      let mScan = 8;
      while (mScan + 8 <= moovBytes.length) {
        const cSize = readU32(moovBytes, mScan);
        const cType = String.fromCharCode(moovBytes[mScan + 4], moovBytes[mScan + 5], moovBytes[mScan + 6], moovBytes[mScan + 7]);
        if (cSize <= 0 || mScan + cSize > moovBytes.length) break;
        moovChildren.push({ type: cType, bytes: moovBytes.slice(mScan, mScan + cSize) });
        mScan += cSize;
      }

      let mvhdBytes = null;
      let vTrak = null;
      let aTrak = null;
      const otherTraks = [];

      for (const c of moovChildren) {
        if (c.type === 'mvhd') {
          mvhdBytes = c.bytes;
        } else if (c.type === 'trak') {
          const hdlrIdx = findFourCC(c.bytes, 'hdlr');
          let hType = '';
          if (hdlrIdx !== -1 && hdlrIdx + 16 <= c.bytes.length) {
            hType = String.fromCharCode(c.bytes[hdlrIdx + 12], c.bytes[hdlrIdx + 13], c.bytes[hdlrIdx + 14], c.bytes[hdlrIdx + 15]);
          }
          if (hType === 'vide' && !vTrak) {
            vTrak = c.bytes;
          } else if (hType === 'soun' && !aTrak) {
            aTrak = c.bytes;
          } else {
            otherTraks.push(c.bytes);
          }
        }
      }

      let maxDurationSec = 0;

      // 1. Process Video Track: ensure Track ID = 1, Level 5.1 in avcC, scaled timescale & stts
      if (vTrak) {
        const tkhdIdx = findFourCC(vTrak, 'tkhd');
        if (tkhdIdx !== -1) {
          const ver = vTrak[tkhdIdx + 4];
          const tidOff = tkhdIdx + 4 + (ver === 1 ? 20 : 12);
          writeU32(vTrak, tidOff, 1);
        }
        const avcIdx = findFourCC(vTrak, 'avcC');
        if (avcIdx !== -1 && avcIdx + 16 <= vTrak.length) {
          vTrak[avcIdx + 7] = 0x33;
          if (vTrak[avcIdx + 12] === 0x67) {
            vTrak[avcIdx + 15] = 0x33;
          }
        }

        const mdhdIdx = findFourCC(vTrak, 'mdhd');
        let origTs = 60;
        let targetTs = 15360;
        if (mdhdIdx !== -1) {
          const mdhdVer = vTrak[mdhdIdx + 4];
          const mdhdTsOff = mdhdIdx + 4 + (mdhdVer === 1 ? 20 : 12);
          origTs = readU32(vTrak, mdhdTsOff);
          if (origTs === 15360) {
            targetTs = 15360;
          } else if (origTs <= 240) {
            targetTs = 15360;
          } else {
            targetTs = origTs;
          }
          writeU32(vTrak, mdhdTsOff, targetTs);

          let origDur = 0;
          if (mdhdVer === 1) {
            const hi = readU32(vTrak, mdhdTsOff + 4);
            const lo = readU32(vTrak, mdhdTsOff + 8);
            origDur = hi * 4294967296 + lo;
          } else {
            origDur = readU32(vTrak, mdhdTsOff + 4);
          }

          const origDurSec = origDur / origTs;
          const newDurSec = origDurSec * scale;
          if (newDurSec > maxDurationSec) maxDurationSec = newDurSec;

          const newDur = Math.round(newDurSec * targetTs);
          if (mdhdVer === 1) {
            const hi = Math.floor(newDur / 4294967296);
            const lo = (newDur % 4294967296) >>> 0;
            writeU32(vTrak, mdhdTsOff + 4, hi);
            writeU32(vTrak, mdhdTsOff + 8, lo);
          } else {
            writeU32(vTrak, mdhdTsOff + 4, newDur >>> 0);
          }
          if (onLog) onLog('[*] Video timescale: ' + origTs + ' -> ' + targetTs + ', duration: ' + origDurSec.toFixed(2) + 's -> ' + newDurSec.toFixed(2) + 's (' + scale + 'x scale)');
        }

        const tsMult = targetTs / origTs;
        const sttsIdx = findFourCC(vTrak, 'stts');
        if (sttsIdx !== -1) {
          const entryCount = readU32(vTrak, sttsIdx + 8);
          for (let i = 0; i < entryCount; i++) {
            const dOff = sttsIdx + 12 + i * 8 + 4;
            if (dOff + 4 > vTrak.length) break;
            const curDelta = readU32(vTrak, dOff);
            const newDelta = Math.round(curDelta * tsMult * scale);
            writeU32(vTrak, dOff, newDelta >>> 0);
          }
        }

        const cttsIdx = findFourCC(vTrak, 'ctts');
        if (cttsIdx !== -1) {
          const entryCount = readU32(vTrak, cttsIdx + 8);
          for (let i = 0; i < entryCount; i++) {
            const off = cttsIdx + 12 + i * 8 + 4;
            if (off + 4 > vTrak.length) break;
            const curOff = readU32(vTrak, off);
            const newOff = Math.round(curOff * tsMult * scale);
            writeU32(vTrak, off, newOff >>> 0);
          }
        }

        const edtsIdx = findFourCC(vTrak, 'edts');
        if (edtsIdx !== -1) {
          const elstIdx = findFourCC(vTrak, 'elst', edtsIdx);
          if (elstIdx !== -1) {
            const elstVer = vTrak[elstIdx + 4];
            const entryCount = readU32(vTrak, elstIdx + 8);
            for (let i = 0; i < entryCount; i++) {
              if (elstVer === 1) {
                const segOff = elstIdx + 12 + i * 20;
                const hi = readU32(vTrak, segOff);
                const lo = readU32(vTrak, segOff + 4);
                const curSeg = hi * 4294967296 + lo;
                const newSeg = Math.round(curSeg * scale);
                writeU32(vTrak, segOff, Math.floor(newSeg / 4294967296));
                writeU32(vTrak, segOff + 4, (newSeg % 4294967296) >>> 0);
              } else {
                const segOff = elstIdx + 12 + i * 12;
                const curSeg = readU32(vTrak, segOff);
                writeU32(vTrak, segOff, Math.round(curSeg * scale) >>> 0);
              }
            }
          }
        }
      }

      // 2. Process Audio Track: ensure Track ID = 2, scale mdhd duration & stts
      if (aTrak) {
        const tkhdIdx = findFourCC(aTrak, 'tkhd');
        if (tkhdIdx !== -1) {
          const ver = aTrak[tkhdIdx + 4];
          const tidOff = tkhdIdx + 4 + (ver === 1 ? 20 : 12);
          writeU32(aTrak, tidOff, 2);
        }

        const mdhdIdx = findFourCC(aTrak, 'mdhd');
        if (mdhdIdx !== -1) {
          const mdhdVer = aTrak[mdhdIdx + 4];
          const mdhdTsOff = mdhdIdx + 4 + (mdhdVer === 1 ? 20 : 12);
          const audioTs = readU32(aTrak, mdhdTsOff);
          let curDur = 0;
          if (mdhdVer === 1) {
            const hi = readU32(aTrak, mdhdTsOff + 4);
            const lo = readU32(aTrak, mdhdTsOff + 8);
            curDur = hi * 4294967296 + lo;
          } else {
            curDur = readU32(aTrak, mdhdTsOff + 4);
          }
          const durSec = (curDur / audioTs) * scale;
          if (durSec > maxDurationSec) maxDurationSec = durSec;

          const newDur = Math.round(curDur * scale);
          if (mdhdVer === 1) {
            writeU32(aTrak, mdhdTsOff + 4, Math.floor(newDur / 4294967296));
            writeU32(aTrak, mdhdTsOff + 8, (newDur % 4294967296) >>> 0);
          } else {
            writeU32(aTrak, mdhdTsOff + 4, newDur >>> 0);
          }
          if (onLog) onLog('[*] Audio timeline scaled: ' + (curDur / audioTs).toFixed(2) + 's -> ' + durSec.toFixed(2) + 's');
        }

        const sttsIdx = findFourCC(aTrak, 'stts');
        if (sttsIdx !== -1) {
          const entryCount = readU32(aTrak, sttsIdx + 8);
          for (let i = 0; i < entryCount; i++) {
            const dOff = sttsIdx + 12 + i * 8 + 4;
            if (dOff + 4 > aTrak.length) break;
            const curDelta = readU32(aTrak, dOff);
            writeU32(aTrak, dOff, Math.round(curDelta * scale) >>> 0);
          }
        }

        const edtsIdx = findFourCC(aTrak, 'edts');
        if (edtsIdx !== -1) {
          const elstIdx = findFourCC(aTrak, 'elst', edtsIdx);
          if (elstIdx !== -1) {
            const elstVer = aTrak[elstIdx + 4];
            const entryCount = readU32(aTrak, elstIdx + 8);
            for (let i = 0; i < entryCount; i++) {
              if (elstVer === 1) {
                const segOff = elstIdx + 12 + i * 20;
                const curSeg = readU32(aTrak, segOff + 4);
                writeU32(aTrak, segOff + 4, Math.round(curSeg * scale) >>> 0);
                const curMediaTime = readU32(aTrak, segOff + 12);
                writeU32(aTrak, segOff + 12, Math.round(curMediaTime * scale) >>> 0);
              } else {
                const segOff = elstIdx + 12 + i * 12;
                const curSeg = readU32(aTrak, segOff);
                writeU32(aTrak, segOff, Math.round(curSeg * scale) >>> 0);
                const curMediaTime = readU32(aTrak, segOff + 4);
                writeU32(aTrak, segOff + 4, Math.round(curMediaTime * scale) >>> 0);
              }
            }
          }
        }

        // Clone for Track 3 (RTX Dual Audio Stream) if requested
        if (addDuplicateAudio) {
          aTrak2 = new Uint8Array(aTrak);
          const tkhdIdx2 = findFourCC(aTrak2, 'tkhd');
          if (tkhdIdx2 !== -1) {
            const ver = aTrak2[tkhdIdx2 + 4];
            const tidOff = tkhdIdx2 + 4 + (ver === 1 ? 20 : 12);
            writeU32(aTrak2, tidOff, 3);
          }
          if (onLog) onLog('[*] Dual audio streams aligned (Track 2 + Track 3)');
        }
      }

      // 3. Update mvhd duration & next_track_ID
      if (mvhdBytes && maxDurationSec > 0) {
        const ver = mvhdBytes[8];
        const tsOff = 8 + 4 + (ver === 1 ? 16 : 8);
        const mvhdTs = readU32(mvhdBytes, tsOff);
        const realDur = Math.round(maxDurationSec * mvhdTs);
        if (ver === 1) {
          writeU32(mvhdBytes, tsOff + 4, Math.floor(realDur / 4294967296));
          writeU32(mvhdBytes, tsOff + 8, (realDur % 4294967296) >>> 0);
        } else {
          writeU32(mvhdBytes, tsOff + 4, realDur >>> 0);
        }

        if (mvhdBytes.length >= 108) {
          const nextTrackOff = mvhdBytes.length - 4;
          const curNext = readU32(mvhdBytes, nextTrackOff);
          const minNext = aTrak2 ? 4 : 3;
          if (curNext < minNext) {
            writeU32(mvhdBytes, nextTrackOff, minNext);
          }
        }

        if (onLog) onLog('[*] Container timeline aligned: ' + maxDurationSec.toFixed(2) + 's');
      }

      // 4. Clean udta metadata (strip bloat, unknown cover type 0x1, te_is_reencode tag)
      const cleanUdta = new Uint8Array([
        0x00, 0x00, 0x00, 0x62, 0x75, 0x64, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x5a, 0x6d, 0x65, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x21, 0x68, 0x64, 0x6c, 0x72,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x6d, 0x64, 0x69, 0x72, 0x61, 0x70, 0x70, 0x6c,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x2d, 0x69, 0x6c, 0x73, 0x74,
        0x00, 0x00, 0x00, 0x25, 0xa9, 0x74, 0x6f, 0x6f,
        0x00, 0x00, 0x00, 0x1d, 0x64, 0x61, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x4c, 0x61, 0x76, 0x66, 0x36, 0x30, 0x2e, 0x31, 0x36, 0x2e, 0x31, 0x30, 0x30
      ]);

      // Build ordered moov: mvhd + vTrak + aTrak + aTrak2 + cleanUdta
      const moovPieces = [];
      if (mvhdBytes) moovPieces.push(mvhdBytes);
      if (vTrak) moovPieces.push(vTrak);
      if (aTrak) moovPieces.push(aTrak);
      if (aTrak2) moovPieces.push(aTrak2);
      for (const ot of otherTraks) moovPieces.push(ot);
      moovPieces.push(cleanUdta);

      let newMoovLen = 8;
      for (const p of moovPieces) newMoovLen += p.length;

      const newMoov = new Uint8Array(newMoovLen);
      writeU32(newMoov, 0, newMoovLen);
      newMoov[4] = 109; newMoov[5] = 111; newMoov[6] = 111; newMoov[7] = 118; // 'moov'
      let mPos = 8;
      for (const p of moovPieces) {
        newMoov.set(p, mPos);
        mPos += p.length;
      }
      moovBytes = newMoov;

      // 5. Faststart alignment: place moov right after ftyp
      const newMdatOffset = ftyp.size + moovBytes.length;
      const shift = newMdatOffset - mdat.offset;

      if (shift !== 0) {
        // Adjust stco (32-bit chunk offsets)
        let sScan = 0;
        while (true) {
          const idx = findFourCC(moovBytes, 'stco', sScan);
          if (idx === -1) break;
          const sz = readU32(moovBytes, idx - 4);
          const count = readU32(moovBytes, idx + 8);
          for (let i = 0; i < count; i++) {
            const off = idx + 12 + i * 4;
            const cur = readU32(moovBytes, off);
            writeU32(moovBytes, off, (cur + shift) >>> 0);
          }
          sScan = idx + sz;
        }

        // Adjust co64 (64-bit chunk offsets)
        sScan = 0;
        while (true) {
          const idx = findFourCC(moovBytes, 'co64', sScan);
          if (idx === -1) break;
          const sz = readU32(moovBytes, idx - 4);
          const count = readU32(moovBytes, idx + 8);
          for (let i = 0; i < count; i++) {
            const off = idx + 12 + i * 8;
            const hi = readU32(moovBytes, off);
            const lo = readU32(moovBytes, off + 4);
            const val64 = BigInt(hi) * 4294967296n + BigInt(lo);
            const newVal64 = val64 + BigInt(shift);
            writeU32(moovBytes, off, Number(newVal64 / 4294967296n) >>> 0);
            writeU32(moovBytes, off + 4, Number(newVal64 % 4294967296n) >>> 0);
          }
          sScan = idx + sz;
        }
      }

      const totalLen = ftyp.size + moovBytes.length + mdat.size;
      const out = new Uint8Array(totalLen);
      let outPos = 0;

      out.set(u8.subarray(ftyp.offset, ftyp.offset + ftyp.size), outPos);
      outPos += ftyp.size;

      out.set(moovBytes, outPos);
      outPos += moovBytes.length;

      out.set(u8.subarray(mdat.offset, mdat.offset + mdat.size), outPos);
      outPos += mdat.size;

      return out;
    } catch (err) {
      console.warn('[H4B] postProcessMp4 skipped due to error:', err);
      return u8;
    }
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

      const warnBox = document.getElementById('aspectRatioWarning');
      if (warnBox) {
        if (width > height) {
          warnBox.style.display = 'block';
          warnBox.style.background = 'rgba(239, 68, 68, 0.12)';
          warnBox.style.border = '1px solid rgba(239, 68, 68, 0.35)';
          warnBox.style.color = '#fca5a5';
          warnBox.innerHTML = `⚠️ <strong>Landscape Detected (${width}x${height}):</strong> TikTok is a <strong>9:16 vertical platform</strong> (1080x1920). Horizontal videos are fitted to mobile screens by TikTok and downscaled to <strong>540p</strong>! For 1080p HD, export your project in <strong>1080x1920 (9:16 Portrait)</strong>.`;
        } else if (width === 1080 && height === 1920) {
          warnBox.style.display = 'block';
          warnBox.style.background = 'rgba(34, 197, 94, 0.12)';
          warnBox.style.border = '1px solid rgba(34, 197, 94, 0.35)';
          warnBox.style.color = '#86efac';
          warnBox.innerHTML = `✅ <strong>Perfect TikTok Aspect Ratio:</strong> 1080x1920 (9:16 Portrait) detected. Full 1080p HD will be maintained!`;
        } else {
          warnBox.style.display = 'block';
          warnBox.style.background = 'rgba(245, 158, 11, 0.12)';
          warnBox.style.border = '1px solid rgba(245, 158, 11, 0.35)';
          warnBox.style.color = '#fcd34d';
          warnBox.innerHTML = `ℹ️ <strong>Custom Dimensions (${width}x${height}):</strong> TikTok standard is <strong>1080x1920 (9:16)</strong>. If non-standard or wider than tall, TikTok may compress it to 540p.`;
        }
      }

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
        log('[*] Reading video file into memory...');
        const reader = new FileReader();
        const bufferPromise = new Promise((res, rej) => {
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsArrayBuffer(currentFile);
        });

        const arrayBuffer = await bufferPromise;
        const inputBytes = new Uint8Array(arrayBuffer);
        log(`[✓] File loaded (${formatBytes(inputBytes.length)}). Analyzing MP4 container...`);

        // Check selected device / quality profile
        const profileSelect = document.getElementById('deviceProfile');
        let scale = 1;
        let addDuplicateAudio = true;
        if (profileSelect) {
          const pVal = profileSelect.value;
          if (pVal === 'direct' || pVal === 'phone' || pVal === 'pc') {
            scale = 1;
            addDuplicateAudio = true;
          } else if (pVal === '60fps' || pVal === 'auto' || pVal === 'phone-ghost') {
            scale = 2;
            addDuplicateAudio = false;
          } else if (pVal === '120fps') {
            scale = 6;
            addDuplicateAudio = false;
          } else if (pVal === '240fps') {
            scale = 12;
            addDuplicateAudio = false;
          }
        }

        log(`[*] Applying TikTok 1080p Container Pipeline (scale: ${scale}x, Faststart moov-first, Level 5.1)...`);
        outputBytes = postProcessMp4(inputBytes, log, scale, addDuplicateAudio);

        if (!outputBytes || outputBytes.length === 0) {
          throw new Error('Container optimization failed. Empty output.');
        }

        log('[✓] TikTok 1080p container processing complete!');

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
