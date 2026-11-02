// Create unified bxd-engine.js combining chunk_91, chunk_969, and chunk_235
const fs = require('fs');
const path = require('path');

const chunk91 = fs.readFileSync('chunk_91.js', 'utf8');
const chunk969 = fs.readFileSync('chunk_969.js', 'utf8');
const chunk235 = fs.readFileSync('chunk_235.js', 'utf8');

const engineWrapper = `
(function() {
  var globalTarget = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : self);
  if (!globalTarget.self) globalTarget.self = globalTarget;
  globalTarget.webpackChunk_N_E = globalTarget.webpackChunk_N_E || [];

  function createMockRequire() {
    var fn = function(id) {};
    fn.r = function(exports) {
      if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
      }
      Object.defineProperty(exports, '__esModule', { value: true });
    };
    fn.d = function(exports, definition) {
      for (var key in definition) {
        if (Object.prototype.hasOwnProperty.call(definition, key) && !Object.prototype.hasOwnProperty.call(exports, key)) {
          Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
        }
      }
    };
    return fn;
  }

  // Execute chunk 91 (V2 Method Engine)
  ${chunk91}

  // Execute chunk 969 (V1 Classic Method Engine)
  ${chunk969}

  // Execute chunk 235 (Canvas Confetti)
  ${chunk235}

  // Extract and attach exported functions to window / globalTarget
  var mockReq = createMockRequire();
  for (var i = 0; i < globalTarget.webpackChunk_N_E.length; i++) {
    var entry = globalTarget.webpackChunk_N_E[i];
    var modules = entry[1];
    for (var modId in modules) {
      var mod = { exports: {} };
      try {
        modules[modId](mod, mod.exports, mockReq);
        if (mod.exports.remuxMp4Boxes) globalTarget.remuxMp4Boxes = mod.exports.remuxMp4Boxes;
        if (mod.exports.injectMetadata) globalTarget.injectMetadata = mod.exports.injectMetadata;
        if (mod.exports.probeMp4Bitrate) globalTarget.probeMp4Bitrate = mod.exports.probeMp4Bitrate;
        if (mod.exports.parseMp4Structure) globalTarget.parseMp4Structure = mod.exports.parseMp4Structure;
        if (mod.exports.transformVideo) globalTarget.transformVideo = mod.exports.transformVideo;
        if (mod.exports.default && typeof mod.exports.default === 'function') {
          if (modId === '9235') globalTarget.confetti = mod.exports.default;
        }
      } catch(e) {
        // module initialization error ignore
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      remuxMp4Boxes: globalTarget.remuxMp4Boxes,
      injectMetadata: globalTarget.injectMetadata,
      transformVideo: globalTarget.transformVideo,
      probeMp4Bitrate: globalTarget.probeMp4Bitrate,
      parseMp4Structure: globalTarget.parseMp4Structure
    };
  }
})();
`;

fs.writeFileSync('bxd-engine-test.js', engineWrapper);
console.log('Wrote bxd-engine-test.js');
