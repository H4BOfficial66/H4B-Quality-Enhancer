const fs = require('fs');

let methodHtml = fs.readFileSync('public/method.html', 'utf8');

// Switch active link
methodHtml = methodHtml.replace('<a class="nav-link active" href="/method">Method (V2)</a><a class="nav-link " href="/old-method">Classic (V1)</a>', '<a class="nav-link " href="/method">Method (V2)</a><a class="nav-link active" href="/old-method">Classic (V1)</a>');

// Change top switch button to switch to V2
methodHtml = methodHtml.replace('Looking for the classic engine? Switch to Method V1', 'Looking for the next-gen engine? Switch to Method V2');
methodHtml = methodHtml.replace("href='/method'", "href='/old-method'");
methodHtml = methodHtml.replace('<button type="button" style="background:rgba(245, 158, 11, 0.08);border:1px solid rgba(245, 158, 11, 0.3);color:#fbbf24;padding:7px 16px;border-radius:30px;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all 0.2s ease"><span>🛡️ Looking for the classic engine? Switch to Method V1</span><span>→</span></button>', '<a href="/method" style="text-decoration:none"><button type="button" style="background:rgba(168, 85, 247, 0.08);border:1px solid rgba(168, 85, 247, 0.3);color:#c084fc;padding:7px 16px;border-radius:30px;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all 0.2s ease"><span>⚡ Looking for next-gen engine? Switch to Method V2</span><span>→</span></button></a>');

// Inject V1 mode flag in head
methodHtml = methodHtml.replace('<head>', '<head><script>window.IS_V1_MODE = true;</script>');

// Update title and subtitle
methodHtml = methodHtml.replace('BXD Enhancer <span class="hero-accent">Method Engine</span>', 'BXD Enhancer <span class="hero-accent">Classic (V1) Engine</span>');

fs.writeFileSync('public/old-method.html', methodHtml);
console.log('Generated public/old-method.html successfully');
