const fs = require('fs');

const source = fs.readFileSync('index_source.html', 'utf8');

// Extract body inner content up to script tags
let html = source;

// Replace css links with /css/styles.css
html = html.replace(/<link rel="stylesheet" href="\/_next\/static\/css\/[^"]+"[^>]*>/g, '');
html = html.replace(/<link rel="preload"[^>]*>/g, '');
html = html.replace(/<script src="\/_next\/static\/chunks\/[^"]+"[^>]*><\/script>/g, '');
html = html.replace(/<script>\(self\.__next_f[\s\S]*?<\/script>/g, '');

// Clean head
const headExtra = `
  <link rel="stylesheet" href="/css/styles.css" />
  <script src="/js/bxd-engine.js" defer></script>
  <script src="/js/main.js" defer></script>
`;

html = html.replace('</head>', `${headExtra}</head>`);

// Fix asset paths
html = html.replace(/src="\/logo\.png"/g, 'src="/assets/logo.png"');
html = html.replace(/href="\/favicon\.ico"/g, 'href="/assets/favicon.ico"');

// Ensure canvas has ambient-canvas class
html = html.replace('<canvas style="position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.95"></canvas>', '<canvas class="ambient-canvas" style="position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.95"></canvas>');

fs.writeFileSync('public/index.html', html);
console.log('Generated public/index.html successfully');
