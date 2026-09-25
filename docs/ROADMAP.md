# Roadmap

## v0.1 — Starter (this repo) ✅
- [x] Electron click-through overlay + React UI
- [x] Server: enrich / search / fact-check / talking-points + WS stream
- [x] Mock mode so it runs with zero API keys
- [x] Docs: architecture, privacy, roadmap

## v0.2 — Actually useful on calls
- [ ] Google Meet Chrome companion: captions + roster observer → WS
- [ ] Deepgram realtime transcription from mic / loopback (with consent UI)
- [ ] Real LLM verdicts for fact-checks (claim + evidence → verdict + citations)
- [ ] Person memory: Postgres + pgvector, "you met Ada 3 months ago about X"
- [ ] Settings screen: API keys, providers, local-only toggle

## v0.3 — Platform coverage
- [ ] Zoom Meeting SDK app (roster + audio)
- [ ] Teams / Webex adapters
- [ ] Speaker diarization + per-speaker cards auto-switching
- [ ] Post-meeting brief (summary, action items, CRM push)

## v0.4 — Moat
- [ ] Proactive intel: "they just raised Series B — mention it" before you join
- [ ] Objection handling + competitor battlecards triggered by keywords
- [ ] Offline mode: Whisper-local + Ollama, zero cloud calls

## How to contribute
1. Pick a v0.2 item, open an issue, then PR.
2. Never add LinkedIn scraping — enrichment APIs only.
3. Every new capture path must include a consent step.
