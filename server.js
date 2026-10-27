const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data file paths
const counterFilePath = path.join(__dirname, 'data', 'counter.json');
const contactsFilePath = path.join(__dirname, 'data', 'contacts.json');

// Helper to get counter
function getCounter() {
  try {
    if (fs.existsSync(counterFilePath)) {
      const data = JSON.parse(fs.readFileSync(counterFilePath, 'utf8'));
      return data.count || 25666;
    }
  } catch (e) {
    console.error('Error reading counter:', e.message);
  }
  return 25666;
}

// Helper to increment counter
function incrementCounter() {
  let count = getCounter() + 1;
  try {
    fs.writeFileSync(counterFilePath, JSON.stringify({ count }, null, 2));
  } catch (e) {
    console.error('Error writing counter:', e.message);
  }
  return count;
}

// Cached discord stats
let discordCache = {
  online: 2636,
  total: 21594,
  iconUrl: "https://cdn.discordapp.com/icons/806083380458291220/a_96414469cafd1825068d1195fcc8913f.gif?size=96",
  lastFetched: 0
};

function fetchDiscordStats() {
  const now = Date.now();
  if (now - discordCache.lastFetched < 60000) {
    return Promise.resolve(discordCache);
  }
  return new Promise((resolve) => {
    const req = https.get('https://discord.com/api/v9/invites/billoxd?with_counts=true', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.approximate_presence_count) {
            discordCache.online = json.approximate_presence_count;
            discordCache.total = json.approximate_member_count || discordCache.total;
            if (json.guild && json.guild.icon) {
              discordCache.iconUrl = `https://cdn.discordapp.com/icons/${json.guild.id}/${json.guild.icon}.gif?size=96`;
            }
            discordCache.lastFetched = Date.now();
          }
        } catch (err) {}
        resolve(discordCache);
      });
    });
    req.on('error', () => resolve(discordCache));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(discordCache);
    });
  });
}

// --- API Endpoints ---

// GET /api/counter
app.get('/api/counter', (req, res) => {
  const count = getCounter();
  res.json({ count, success: true });
});

// GET & POST /api/counter/up
app.all('/api/counter/up', (req, res) => {
  const count = incrementCounter();
  res.json({ count, success: true });
});

// GET /api/discord-members
app.get('/api/discord-members', async (req, res) => {
  const stats = await fetchDiscordStats();
  res.json({
    online: stats.online,
    total: stats.total,
    iconUrl: stats.iconUrl
  });
});

// POST /api/contact
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please fill out all required fields.' });
  }

  const newContact = {
    id: Date.now(),
    name,
    email,
    subject: subject || 'General Support',
    message,
    timestamp: new Date().toISOString()
  };

  try {
    let contacts = [];
    if (fs.existsSync(contactsFilePath)) {
      contacts = JSON.parse(fs.readFileSync(contactsFilePath, 'utf8') || '[]');
    }
    contacts.push(newContact);
    fs.writeFileSync(contactsFilePath, JSON.stringify(contacts, null, 2));
  } catch (err) {
    console.error('Error saving contact:', err.message);
  }

  res.json({ success: true, message: 'Your message has been sent successfully! Our team will respond shortly.' });
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Clean page routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/method', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'method.html'));
});

app.get('/old-method', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'old-method.html'));
});

app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

app.get('/tutorial', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tutorial.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Fallback to index
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`H4B Quality Enhancer clone running at http://localhost:${PORT}`);
});
