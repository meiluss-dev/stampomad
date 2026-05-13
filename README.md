# ✈️ Stampomad

**Stamp the world. Log your journey. Share your story.**

Stampomad is a beautiful personal travel tracking app — map your visited countries, log trips, write journal entries, build satellite route maps, and generate AI-powered travel narratives.

![Stampomad Dashboard](https://stampomad.com/preview.png)

---

## ✨ Features

- 🌍 **Interactive world map** — click countries to mark as visited
- ✈️ **Trip logging** — dates, cities, photos, highlights
- 📖 **Travel journal** — timestamped entries per trip
- 🛰️ **Satellite route maps** — waypoints, highlights, elevation profiles, distance labels
- 📸 **Trip photos** — upload and display cover photos per trip
- ✨ **AI travel narratives** — generate literary summaries from journal entries
- 🌐 **Any language** — translate the entire UI via AI
- 📊 **Rich stats dashboard** — personality badge, continent coverage, timeline, records
- 💾 **Export / Import** — backup and restore all data
- 🔑 **API key management** — Mapbox + Anthropic keys saved locally

---

## 🚀 Quick Start

### Option 1 — Open directly (basic features only)
Just open `stampomad.html` in your browser. Note: AI features require the local server.

### Option 2 — With AI features (recommended)
```bash
# Clone the repo
git clone https://github.com/yourusername/stampomad.git
cd stampomad

# Start the local server
node stampomad-server.js

# Open in browser
open http://localhost:4000/stampomad.html
```

---

## 🔑 API Keys

Stampomad uses two external APIs:

| API | Purpose | Cost |
|-----|---------|------|
| [Mapbox](https://mapbox.com) | Satellite route maps, elevation | Free tier available |
| [Anthropic](https://console.anthropic.com) | AI narratives, translations | Pay per use (~$0.01/request) |

Enter your keys via the **🔑 button** in the nav bar — they're saved to your browser's localStorage.

---

## 📁 Project Structure

```
stampomad/
├── stampomad.html        # Main app (single-file)
├── stampomad-server.js   # Local proxy server (for AI features)
└── README.md
```

---

## 🗺️ Roadmap

- [ ] User accounts (Supabase auth)
- [ ] Cloud data sync
- [ ] Shareable route links
- [ ] Regional maps (US states, Spanish regions)
- [ ] Mobile app (PWA)
- [ ] Pro tier with Stripe

---

## 🛠️ Tech Stack

- **Frontend** — Vanilla HTML/CSS/JS (single file, no build step)
- **Maps** — D3.js + TopoJSON (world map), Mapbox GL JS (satellite routes)
- **AI** — Anthropic Claude API
- **Storage** — localStorage (browser-based)
- **Server** — Node.js (lightweight proxy for API calls)

---

## 📄 License

MIT — free to use, modify and distribute.

---

Made with ❤️ by a traveler, for travelers. 🌍
