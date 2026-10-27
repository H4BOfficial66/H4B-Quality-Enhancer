// H4B Enhancer Common Main Script
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initCounters();
  initDiscordStats();
  initFaq();
  initCyberCanvas();
});

// Header scroll effect & mobile menu
function initHeader() {
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links-wrapper');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }
}

// Live Global Counter
async function initCounters() {
  try {
    const res = await fetch('./api/counter');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.count) {
        const formatted = Number(data.count).toLocaleString();
        document.querySelectorAll('.gs-count').forEach(el => {
          el.textContent = formatted;
        });
        return;
      }
    }
  } catch (e) {
    console.debug('Counter fetch error', e);
  }
  document.querySelectorAll('.gs-count').forEach(el => {
    if (!el.textContent || el.textContent === '0') el.textContent = '25,666';
  });
}

// Live Discord online & total stats
async function initDiscordStats() {
  try {
    const res = await fetch('./api/discord-members');
    if (res.ok) {
      const data = await res.json();
      if (data && data.online) {
        const onlineFormatted = Number(data.online).toLocaleString();
        document.querySelectorAll('.discord-online-count').forEach(el => {
          el.textContent = onlineFormatted;
        });
        const tagLive = document.querySelector('.discord-tag-live span:nth-child(2)');
        if (tagLive) tagLive.textContent = onlineFormatted;
        return;
      }
    }
  } catch (e) {
    console.debug('Discord stats fetch error', e);
  }
  document.querySelectorAll('.discord-online-count').forEach(el => {
    if (!el.textContent || el.textContent === '0') el.textContent = '2,636';
  });
}

// FAQ filtering & accordion toggles
function initFaq() {
  const tabBtns = document.querySelectorAll('.faq-tab-btn');
  const cards = document.querySelectorAll('.faq-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.textContent.trim().toLowerCase();
      cards.forEach(card => {
        const chip = card.querySelector('.faq-category-chip');
        const cat = chip ? chip.textContent.trim().toLowerCase() : '';
        if (filter.includes('all') || filter.includes(cat) || cat.includes(filter)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  cards.forEach(card => {
    const btn = card.querySelector('.faq-card-button');
    if (btn) {
      btn.addEventListener('click', () => {
        const isOpen = card.classList.contains('open');
        cards.forEach(c => c.classList.remove('open'));
        if (!isOpen) {
          card.classList.add('open');
        }
      });
    }
  });
}

// Background cyber grid ambient canvas
function initCyberCanvas() {
  const canvas = document.querySelector('canvas.ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(render);
  }
  render();
}
