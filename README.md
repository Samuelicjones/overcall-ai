# Overcall AI 🧠📞

Your AI copilot that sits on top of Zoom, Google Meet, Teams & Webex.

It watches the call (with consent), figures out **who you're talking to**, pulls **LinkedIn / web context**, listens to **what's being said**, and serves you a realtime overlay with:

- 👤 **Who's who** — name, role, company, background, mutuals
- 💡 **Smart talking points** — relevant to their background + live conversation
- ✅ **Live fact-checks** — claims, numbers, competitors, news
- 🔎 **Realtime intel** — docs, pricing, stats, web results without tab-switching

> Think: Granola + Perplexity + LinkedIn Sales Nav, floating over your meeting.

## How it works

```
[Zoom / Meet / Teams]
        │ captions + roster + audio (with consent)
        ▼
[apps/overlay - Electron transparent window]
        │ websocket: transcript chunks, active speaker
        ▼
[server - Node API + orchestrator]
   ├─► people-resolver (LinkedIn enrichment via Proxycurl / RocketReach / manual add)
   ├─► transcriber (Deepgram / Whisper)
   ├─► web-search (Tavily / Brave / Exa)
   └─► LLM (OpenAI / Anthropic) → talking points, fact-checks, summaries
        ▼
[overlay UI] person cards, talking points feed, fact-check ticker
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full system design.

## Quickstart

```bash
# 1. clone
git clone https://github.com/YOUR_USERNAME/overcall-ai.git
cd overcall-ai

# 2. install (Node 20+)
npm install

# 3. configure
cp .env.example .env
# fill in OPENAI_API_KEY, TAVILY_API_KEY, DEEPGRAM_API_KEY, PROXYCURL_API_KEY etc.

# 4. run backend + overlay in dev
npm run dev
```

- Server: http://localhost:8787 (health: `/health`, WS: `/ws/stream`)
- Overlay: Electron transparent window, `Ctrl+Shift+O` to toggle, `Ctrl+Shift+H` to hide.

## Repo layout

```
overcall-ai/
  apps/overlay/        # Electron + Vite + React + TS — always-on-top transparent overlay
  server/              # Node + Fastify + WS — transcription, people lookup, search, LLM
  packages/shared/     # Shared TS types (Person, TalkingPoint, FactCheck, TranscriptChunk)
  docs/                # ARCHITECTURE, ROADMAP, PRIVACY (important!)
```

## Key features (v0.1 starter — all wired with stubs)

- [x] Click-through overlay scaffold
- [x] Roster capture (paste names / CSV, Meet captions observer stub, Zoom SDK hook stub)
- [x] Person enrichment API (`POST /api/people/enrich`) — Proxycurl-ready, mock fallback
- [x] Realtime transcript WS (`/ws/stream`) + talking-points engine
- [x] Fact-check API (`POST /api/fact-check`) + web search abstraction (Tavily-ready)
- [x] Privacy-first defaults: consent banner, local-first option, no secret recording

## Legal / privacy — READ THIS

This tool **must only be used with informed consent** from all meeting participants where required by law (two-party consent states, GDPR, etc.).

- No scraping LinkedIn in violation of ToS — use official enrichment APIs (Proxycurl, RocketReach, People Data Labs) or user-provided profiles.
- No stealth recording — show the consent banner, announce the assistant.
- See [`docs/PRIVACY.md`](docs/PRIVACY.md).

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) — next: Meet Chrome observer, Zoom Meeting SDK, vector memory, CRM push.

## Contributing

PRs welcome. Run `npm run typecheck` + `npm run lint` before pushing.

## License

MIT — see [LICENSE](LICENSE).
