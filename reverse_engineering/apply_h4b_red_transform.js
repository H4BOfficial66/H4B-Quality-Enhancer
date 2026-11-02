const fs = require('fs');
const path = require('path');

console.log('--- Starting BXD -> H4B and Purple -> Red Transformation ---');

// 1. Transform CSS in public/css/styles.css
let css = fs.readFileSync('public/css/styles.css', 'utf8');

// Replace hex colors
css = css.replace(/#c084fc\b/gi, '#f87171');
css = css.replace(/#a855f7\b/gi, '#ef4444');
css = css.replace(/#9333ea\b/gi, '#dc2626');
css = css.replace(/#7c3aed\b/gi, '#b91c1c');
css = css.replace(/#d8b4fe\b/gi, '#fca5a5');
css = css.replace(/#e9d5ff\b/gi, '#fee2e2');
css = css.replace(/#581c87\b/gi, '#7f1d1d');
css = css.replace(/#3b0764\b/gi, '#450a0a');

// Replace RGBA colors
css = css.replace(/168,\s*85,\s*247/g, '239, 68, 68');
css = css.replace(/192,\s*132,\s*252/g, '248, 113, 113');
css = css.replace(/147,\s*51,\s*234/g, '220, 38, 38');
css = css.replace(/124,\s*58,\s*237/g, '185, 28, 28');

// Add specific classes for ambient red glow and primary button gradients
const extraCss = `

/* --- H4B Crimson Red Theme System --- */
.ambient-glow-purple,
.ambient-glow-red {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.42) 0%, rgba(220, 38, 38, 0.18) 45%, transparent 72%) !important;
}

.hero-accent {
  background: linear-gradient(135deg, #ffffff 0%, #fca5a5 40%, #ef4444 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.primary-action-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%) !important;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.45), 0 0 30px rgba(239, 68, 68, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.primary-action-btn:hover {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%) !important;
  box-shadow: 0 6px 25px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.35) !important;
}

.global-stats-badge {
  border: 1px solid rgba(239, 68, 68, 0.35) !important;
  background: rgba(239, 68, 68, 0.1) !important;
}

.gs-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.5) !important;
}

.faq-tab-btn.active {
  background: rgba(239, 68, 68, 0.16) !important;
  border-color: rgba(239, 68, 68, 0.45) !important;
  color: #fca5a5 !important;
}

.v2-plus-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.45) !important;
}

.v2-step-item.active .v2-step-circle {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5) !important;
}

.side-banner-btn {
  background: rgba(239, 68, 68, 0.15) !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  color: #fca5a5 !important;
}

.side-banner-btn:hover {
  background: #ef4444 !important;
  color: #ffffff !important;
}
`;

css += extraCss;
fs.writeFileSync('public/css/styles.css', css);
console.log('✓ public/css/styles.css updated with red theme');

// 2. Transform HTML files
const htmlFiles = ['index.html', 'method.html', 'old-method.html', 'stats.html', 'tutorial.html', 'contact.html'];

htmlFiles.forEach(file => {
  const filePath = path.join('public', file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf8');

  // Replace BXD -> H4B
  html = html.replace(/BXD/g, 'H4B');
  html = html.replace(/bxd_/g, 'h4b_');
  html = html.replace(/_bxd_/g, '_h4b_');
  html = html.replace(/_bxd\./g, '_h4b.');

  // Replace colors in inline styles and classes
  html = html.replace(/#c084fc\b/gi, '#f87171');
  html = html.replace(/#a855f7\b/gi, '#ef4444');
  html = html.replace(/#9333ea\b/gi, '#dc2626');
  html = html.replace(/#7c3aed\b/gi, '#b91c1c');
  html = html.replace(/#d8b4fe\b/gi, '#fca5a5');
  html = html.replace(/#e9d5ff\b/gi, '#fee2e2');

  html = html.replace(/168,\s*85,\s*247/g, '239, 68, 68');
  html = html.replace(/192,\s*132,\s*252/g, '248, 113, 113');
  html = html.replace(/147,\s*51,\s*234/g, '220, 38, 38');
  html = html.replace(/124,\s*58,\s*237/g, '185, 28, 28');

  html = html.replace(/selection:bg-purple-500/g, 'selection:bg-red-600');
  html = html.replace(/ambient-glow-purple/g, 'ambient-glow-red');

  fs.writeFileSync(filePath, html);
  console.log(`✓ public/${file} updated (BXD -> H4B, Purple -> Red)`);
});

// 3. Transform public/js/main.js
let mainJs = fs.readFileSync('public/js/main.js', 'utf8');
mainJs = mainJs.replace(/168,\s*85,\s*247/g, '239, 68, 68');
mainJs = mainJs.replace(/#a855f7/g, '#ef4444');
mainJs = mainJs.replace(/BXD/g, 'H4B');
fs.writeFileSync('public/js/main.js', mainJs);
console.log('✓ public/js/main.js updated');

// 4. Transform public/js/method-app.js
let methodJs = fs.readFileSync('public/js/method-app.js', 'utf8');
methodJs = methodJs.replace(/BXD/g, 'H4B');
methodJs = methodJs.replace(/_bxd_optimized\.mp4/g, '_h4b_optimized.mp4');
methodJs = methodJs.replace(/\[\s*'#c084fc',\s*'#a855f7',\s*'#34d399',\s*'#60a5fa'\s*\]/g, "['#ef4444', '#f87171', '#dc2626', '#fca5a5', '#fee2e2']");
methodJs = methodJs.replace(/#c084fc/g, '#f87171');
methodJs = methodJs.replace(/#a855f7/g, '#ef4444');
methodJs = methodJs.replace(/168,\s*85,\s*247/g, '239, 68, 68');
methodJs = methodJs.replace(/comment:\s*'BXD Quality Enhancer'/g, "comment: 'H4B Quality Enhancer'");
methodJs = methodJs.replace(/artist:\s*'BilloXD'/g, "artist: 'H4B'");
methodJs = methodJs.replace(/composer:\s*'BilloXD'/g, "composer: 'H4B'");
fs.writeFileSync('public/js/method-app.js', methodJs);
console.log('✓ public/js/method-app.js updated');

// 5. Update server.js
let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(/BXD/g, 'H4B');
fs.writeFileSync('server.js', serverJs);
console.log('✓ server.js updated');

// 6. Update README.md
let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace(/BXD/g, 'H4B');
readme = readme.replace(/_bxd_/g, '_h4b_');
readme = readme.replace(/purple\/violet/gi, 'crimson red');
fs.writeFileSync('README.md', readme);
console.log('✓ README.md updated');

console.log('--- All transformations applied successfully! ---');
