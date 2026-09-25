# Overcall AI ⚡📞

Your AI copilot that floats over Zoom, Google Meet, Teams & Webex.

With consent, it figures out **who you're talking to**, listens to **what's being said**, and serves a realtime overlay:

- 👤 **Who's who** — role, company, background, LinkedIn
- 💡 **Say this next** — talking points grounded in their background + live transcript
- ✅ **Live fact-checks** — verdicts with cited sources
- 🔎 **Realtime intel** — pricing, competitors, news without tab-switching
- 📋 **Meeting brief** — summary, decisions, action items, follow-up draft

> Granola + Perplexity + LinkedIn Sales Nav, floating over your meeting. **Gemini-native, free tier friendly.**

## 5-minute setup (Gemini)

1. **Free Gemini key** → https://aistudio.google.com → Get API key
2. **Clone + install** (Node 20+):
```bash
git clone https://github.com/Samuelicjones/overcall-ai.git
cd overcall-ai
npm install
cp .env.example .env
```
3. **Edit `.env`** — minimum for full AI:
```
GEMINI_API_KEY=AIzaSy...your-key
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
# optional but recommended for live fact-checks:
TAVILY_API_KEY=tvly-...   # https://tavily.com (free tier)
```
4. **Run**:
```bash
npm run dev          # server (8787) + overlay (5173)
```
5. **Use on a call**:
- Paste roster → **People → Enrich roster**
- Paste captions (or hit **○ Mic (free)** in Chrome/Edge, or install the Meet companion below)
- Watch **● Live** for talking points + fact-checks → **Brief** for the follow-up

Health check: http://localhost:8787/health shows `provider: gemini`, `mockMode: false`.

## How it works

```
[Zoom / Meet / Teams]
        │ captions + roster (with consent: mic button / paste / Meet companion)
        ▼
[apps/overlay — Electron transparent click-through window]
        │ WS /ws/stream : transcript + roster in → talking-points + fact-checks out
        ▼
[server — Fastify + WS]
   ├─► llm.ts (Gemini → OpenAI → Anthropic → Ollama → mock)
   ├─► peopleResolver (Proxycurl / RocketReach / manual — never scrape LinkedIn)
   ├─► webIntel (Tavily → Brave → Exa → mock) + LLM verdicts
   └─► talkingPoints + brief
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repo layout

```
overcall-ai/
  apps/overlay/         # Electron + Vite + React — click-through overlay (tabs: Live/People/Search/Brief/Settings)
  apps/meet-companion/  # Chrome extension — forwards Meet captions + roster to localhost (optional)
  server/               # Fastify + WS API — /api/config|search|fact-check|talking-points|brief|people/*
  packages/shared/      # Shared TS types
  docs/                 # ARCHITECTURE, ROADMAP, PRIVACY (read this!)
```

## API cheat sheet

| Endpoint | Purpose |
|---|---|
| `GET /health`, `GET /api/config` | provider/key status (no secrets leaked) |
| `POST /api/people/batch` | enrich roster → person cards |
| `POST /api/talking-points` | transcript + people → 3 next lines |
| `POST /api/fact-check` | claim → verdict + sources |
| `POST /api/search` | live web intel |
| `POST /api/brief` | post-meeting markdown brief |
| `WS /ws/stream` | realtime: `transcript`/`roster` in, `talking-points`/`fact-check` out |

## Meet companion (optional, Chrome)

No bots: reads captions you already see. See [`apps/meet-companion/README.md`](apps/meet-companion/README.md).
1. `chrome://extensions` → Developer mode → Load unpacked → `apps/meet-companion/`
2. Enable, join Meet with CC on, announce the assistant.

## Privacy — READ THIS

Only with informed consent (two-party states, GDPR). No LinkedIn scraping — enrichment APIs or manual paste only. No audio stored by default; transcripts live in memory. See [`docs/PRIVACY.md`](docs/PRIVACY.md).

## Roadmap

v0.2 done here: Gemini verdicts, brief, Meet companion, mic mode. Next: Zoom SDK, speaker diarization, CRM push. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
