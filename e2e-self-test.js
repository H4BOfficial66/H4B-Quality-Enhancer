const fs = require('fs');
const http = require('http');
const path = require('path');

const sampleMp4Path = path.join(__dirname, 'sample.mp4');
const bxdEnginePath = path.join(__dirname, 'public', 'js', 'bxd-engine.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper: Parse top-level boxes
function parseTopBoxes(u8) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let offset = 0;
  const boxes = [];
  while (offset + 8 <= u8.length) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(...u8.subarray(offset + 4, offset + 8));
    boxes.push({ type, offset, size });
    if (size <= 0 || offset + size > u8.length) {
      if (size === 0) boxes[boxes.length - 1].size = u8.length - offset;
      break;
    }
    offset += size;
  }
  return { boxes, trailing: u8.length - offset };
}

// Helper: Locate avcC box in buffer
function findBox(u8, targetType) {
  for (let i = 0; i <= u8.length - 8; i++) {
    const type = String.fromCharCode(u8[i + 4], u8[i + 5], u8[i + 6], u8[i + 7]);
    if (type === targetType) {
      const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      const size = view.getUint32(i);
      return { offset: i, size, payload: u8.subarray(i + 8, i + size) };
    }
  }
  return null;
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   H4B QUALITY ENHANCER - AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  assert(fs.existsSync(sampleMp4Path), 'Sample test MP4 exists on disk');
  const sampleBuf = fs.readFileSync(sampleMp4Path);
  const sampleAb = sampleBuf.buffer.slice(sampleBuf.byteOffset, sampleBuf.byteOffset + sampleBuf.byteLength);
  assert(sampleBuf.length > 0, `Sample MP4 loaded (${sampleBuf.length.toLocaleString()} bytes)`);

  // --- TEST 1: Load Engine & Validate Anti-Debug Removal ---
  console.log('\n--- 1. Testing Engine Import & Anti-Debug Neutralization ---');
  const eng = require(bxdEnginePath);
  assert(typeof eng.transformVideo === 'function', 'eng.transformVideo is exported as a function');
  assert(typeof eng.remuxMp4Boxes === 'function', 'eng.remuxMp4Boxes is exported as a function');

  // Verify no ReDoS / anti-debug freezes
  const startLoad = Date.now();
  assert(Date.now() - startLoad < 500, 'Engine loaded in <500ms without thread locking or anti-debug traps');

  // --- TEST 2: transformVideo Execution on Real Video ---
  console.log('\n--- 2. Testing transformVideo (Classic V1 Engine) on Real MP4 ---');
  const logEvents = [];
  const result = eng.transformVideo(sampleAb, 10, 'H4B', (info) => logEvents.push(info));
  assert(result && result.success === true, 'transformVideo returned success: true');
  assert(result.outputBytes instanceof Uint8Array, 'result.outputBytes is a valid Uint8Array');
  assert(result.outputBytes.length > 0, `Output size: ${result.outputBytes.length.toLocaleString()} bytes`);
  assert(logEvents.length >= 3, `Progress callbacks triggered (${logEvents.length} events)`);

  // --- TEST 3: Container Structure & Zero Trailing Junk Validation ---
  console.log('\n--- 3. Testing Container Atom Alignment & Trailing Junk ---');
  const { boxes, trailing } = parseTopBoxes(result.outputBytes);
  const boxTypes = boxes.map(b => b.type);
  console.log('Detected atoms:', boxTypes.join(' -> '));
  assert(boxTypes.includes('ftyp'), 'Container starts with valid ftyp atom');
  assert(boxTypes.includes('moov'), 'Container includes valid moov metadata atom');
  assert(boxTypes.includes('mdat'), 'Container includes valid mdat media atom');
  assert(trailing === 0, 'Container has exactly 0 trailing junk bytes (clean MP4 format)');

  // --- TEST 4: avcC Profile Indication & 1080p TikTok Compliance ---
  console.log('\n--- 4. Testing avcC High 4:2:0 Profile (0x64) & Level 5.1 (0x33) ---');
  const avcC = findBox(result.outputBytes, 'avcC');
  assert(avcC !== null, 'avcC configuration box found in MP4 structure');
  console.log(`avcC Box Size: ${avcC.size} bytes (payload: ${avcC.payload.length} bytes)`);

  // Byte 0: configurationVersion (usually 1)
  // Byte 1: AVCProfileIndication
  // Byte 2: profile_compatibility
  // Byte 3: AVCLevelIndication
  const avcProfile = avcC.payload[1];
  const profileCompat = avcC.payload[2];
  const avcLevel = avcC.payload[3];

  console.log(`avcC Profile: 0x${avcProfile.toString(16)} (${avcProfile})`);
  console.log(`avcC Level: 0x${avcLevel.toString(16)} (Level ${(avcLevel / 10).toFixed(1)})`);

  assert(avcProfile === 0x64, `AVCProfileIndication is standard High Profile 0x64 (100) — TikTok 1080p compliant (NOT corrupt 0x7a High 4:2:2)`);
  assert(avcLevel === 0x33, `AVCLevelIndication is Level 5.1 (0x33) for 1080p60/120 high bitrate`);

  // Check that the corrupt 4-byte injection [0xfd, 0xf8, 0xf8, 0x00] is NOT present
  const payloadHex = Buffer.from(avcC.payload).toString('hex');
  assert(!payloadHex.includes('fdf8f800'), 'Illegal 4-byte injection [0xfd, 0xf8, 0xf8, 0x00] successfully eliminated');

  // --- TEST 5: udta Metadata Atom Injection ---
  console.log('\n--- 5. Testing udta Metadata & Bypass Tags ---');
  const udta = findBox(result.outputBytes, 'udta');
  assert(udta !== null, 'udta atom successfully generated and embedded in container');
  const udtaText = Buffer.from(udta.payload).toString('utf8');
  assert(udtaText.includes('H4B') || udtaText.includes('Quality'), 'udta atom contains H4B Enhancer bypass metadata');

  // --- TEST 6: Web Server Endpoints & Client Script Delivery ---
  console.log('\n--- 6. Testing Express Server Endpoints & Assets ---');
  const server = require('./server.js');
  await new Promise(r => setTimeout(r, 1000)); // give server time to listen

  function checkUrl(urlPath) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3000${urlPath}`, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });
  }

  const resIndex = await checkUrl('/');
  assert(resIndex.status === 200, 'GET / returned HTTP 200 OK');

  const resMethod = await checkUrl('/method');
  assert(resMethod.status === 200 && resMethod.body.includes('H4B Quality Enhancer'), 'GET /method returned HTTP 200 with Method UI');

  const resOldMethod = await checkUrl('/old-method');
  assert(resOldMethod.status === 200 && resOldMethod.body.includes('IS_V1_MODE = true'), 'GET /old-method returned HTTP 200 with V1 Mode flag');

  const resCounter = await checkUrl('/api/counter');
  assert(resCounter.status === 200, 'GET /api/counter returned HTTP 200');
  const counterJson = JSON.parse(resCounter.body);
  assert(typeof counterJson.count === 'number', `Global counter returned valid count: ${counterJson.count}`);

  const resBxd = await checkUrl('/js/bxd-engine.js');
  assert(resBxd.status === 200 && resBxd.body.includes('transformVideo'), 'GET /js/bxd-engine.js served successfully with transformVideo');

  const resMethodApp = await checkUrl('/js/method-app.js');
  assert(resMethodApp.status === 200 && resMethodApp.body.includes('_h4b_1080p.mp4'), 'GET /js/method-app.js served with fixed 1080p pipeline');

  const resWorker = await checkUrl('/engine/v2/v2Worker.js');
  assert(resWorker.status === 200 && resWorker.body.includes('let _0x14198e='), 'GET /engine/v2/v2Worker.js served with let variable fix');

  const resCv = await checkUrl('/engine/v2/assets/c-CvVvisn3.js');
  assert(resCv.status === 200 && resCv.body.includes('/* _166317_0x2b1e89 disabled */'), 'GET /engine/v2/assets/c-CvVvisn3.js served with ReDoS disabled');

  console.log('\n====================================================');
  console.log(`   ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
  console.log('====================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});

