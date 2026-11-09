# H4B Quality Enhancer (TikTok 120FPS Method) — Full Stack Clone

A reverse-engineered, high-fidelity clone of [method.billoxd.site](https://method.billoxd.site/). This application restructures MP4/MOV video containers locally in the browser to bypass TikTok CDN video compression throttling and preserve crisp 4K & 120FPS edits without re-encoding.

---

## 🌟 Features

- **Next-Gen Method Engine (V2)**:
  - 3-step interactive container remuxer (`1. Video Selection`, `2. Method Processing`, `3. Instant Download`).
  - Restructures MP4 container atoms (`moov`, `mvhd`, `mdhd`, `trak`, `stts`, `minf`, etc.) to set custom 120FPS timescales without touching raw video pixels or bitrate.
  - Injects signature bypass metadata (`comment`, `artist`, `composer`).
  - Real-time terminal log viewer displaying atom restructuring operations.
  - Celebratory confetti explosion upon successful enhancement.
  - Automatic download naming (`<filename>_h4b_optimized.mp4`).
- **Classic Method Engine (V1)**:
  - Alternative classic container patcher available on `/old-method`.
- **Live Platform Counter**:
  - Global badge tracking enhanced video count (`25,000+` videos), synchronizing with backend `/api/counter` and incrementing on `/api/counter/up`.
- **Live Facebook Community Stats**:
  - Real-time member & online presences (`2,600+` online) dynamically queried through `/api/discord-members`.
- **TikTok Video Quality & Engagement Inspector**:
  - Interactive URL inspector on `/stats` for analyzing video parameters.
- **Official Tutorial Guide**:
  - Step-by-step rendering instructions with embedded official guide video on `/tutorial`.
- **Interactive Contact Form**:
  - Accessible on `/contact` with form submission handling via `/api/contact`.
- **Aesthetics & Design**:
  - Premium cyber-dark mode aesthetic (`bg-dark-950`), ambient crimson red glow, cyber-grid canvas, glassmorphic cards, and responsive mobile navigation.

---

## 🔬 Reverse-Engineering Insights

By inspecting and deobfuscating the client bundles and Next.js chunks of `method.billoxd.site`:
1. **MP4 Atom Remuxing**: Found in chunk `91` (`static/chunks/91.bdf0aa4146059257.js`), the engine extracts the `moov` atom, adjusts duration/timescale properties in `mvhd` and `mdhd`, re-indexes sample delta timings (`stts`), and serializes clean 32-bit container atoms.
2. **Metadata Injection**: Rewrites internal `udta` metadata to match signatures favored by TikTok's web ingest decoder.
3. **100% Client-Side Privacy**: Processing executes purely in browser memory (`ArrayBuffer` & `DataView`) with zero video payloads transmitted over the wire.
4. **Backend Services**: Lightweight endpoints powering global analytics (`/api/counter`, `/api/counter/up`) and guild metrics (`/api/discord-members`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
├── public/
│   ├── css/
│   │   └── styles.css          # Full design system & cyber-dark theme
│   ├── js/
│   │   ├── bxd-engine.js       # Reverse-engineered MP4 container remuxer
│   │   ├── main.js             # Navigation, counters, ambient canvas, FAQ
│   │   └── method-app.js       # Stepper, drag & drop, terminal logs, download
│   ├── assets/
│   │   ├── logo.png
│   │   ├── favicon.ico
│   │   └── enahncerlogo.png
│   ├── index.html              # Home page
│   ├── method.html             # Method V2 converter page
│   ├── old-method.html         # Classic V1 converter page
│   ├── stats.html              # TikTok Video Inspector
│   ├── tutorial.html           # Official Video Guide
│   └── contact.html            # Contact Us page
├── data/
│   ├── counter.json            # Persistent enhancement counter
│   └── contacts.json           # Contact form submissions
├── reverse_engineering/        # Extracted source chunks, scripts, and logs
├── server.js                   # Express server and API endpoints
└── package.json
```

---

## 📡 Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/counter` | Returns current total videos enhanced `{ count, success }` |
| `GET/POST` | `/api/counter/up` | Increments counter and returns updated count |
| `GET` | `/api/discord-members` | Proxies Facebook guild statistics `{ online, total, iconUrl }` |
| `POST` | `/api/contact` | Receives contact inquiries and persists them to `data/contacts.json` |
