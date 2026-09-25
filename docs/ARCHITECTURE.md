# Architecture — Overcall AI

## Goal
Realtime copilot overlay for Zoom / Google Meet / Teams / Webex that answers:
1. Who am I talking to? (identity + context)
2. What should I say next? (talking points grounded in their background + live transcript)
3. Is that true? (fact-check + live web intel)

## Non-goals (v0.1)
- No stealth recording. Consent banner is mandatory.
- No LinkedIn HTML scraping. Use enrichment APIs only.
- No meeting-platform bots that violate ToS without user auth.

## Components

### 1. `apps/overlay` (Electron + Vite + React)
- Transparent, always-on-top, click-through window (`setIgnoreMouseEvents`).
- Hotkeys: `Ctrl+Shift+O` toggle interact, `Ctrl+Shift+H` hide/show.
- WS client to `ws://localhost:8787/ws/stream`.
- Roster input (paste from participant list) → `POST /api/people/batch`.
- Caption box (paste or future auto-captions) → WS `transcript` messages.
- Renders: person cards, talking-points feed, fact-check ticker.

Future capture paths (per platform):
- **Google Meet (easiest):** Chrome extension content-script reading live captions DOM + roster DOM → postMessage to overlay. No bots needed.
- **Zoom:** Meeting SDK (auth via OAuth) for roster + audio → Deepgram for transcription. Or local mic loopback with consent.
- **Teams/Webex:** Same pattern: official SDK / captions observer where possible.
- **Fallback universal:** system-audio captions (Windows WASAPI loopback / macOS ScreenCaptureKit) + Whisper-local.

### 2. `server` (Fastify + WS)
- `POST /api/people/enrich|batch` → `services/peopleResolver.ts`
  - Proxycurl if `linkedinUrl` + key, else RocketReach/PDL TODO, else mock.
- `POST /api/search`, `POST /api/fact-check` → `services/webIntel.ts`
  - Tavily → Brave → Exa → mock. Returns `{title,url,snippet}` with citations.
- `POST /api/talking-points` + `WS /ws/stream` → `services/talkingPoints.ts`
  - OpenAI (`gpt-4o-mini` default) with JSON mode, template fallback in MOCK_MODE.
  - Rolling 3000-char transcript window; emits every final chunk.

### 3. `packages/shared` — TS contracts (`PersonProfile`, `TranscriptChunk`, `TalkingPoint`, `FactCheck`).

## Data flow (realtime)
1. Roster enrich at meeting start → person cards + baseline talking points.
2. Transcript chunks stream over WS (final=true triggers inference).
3. Server: talking-points (LLM) + fact-check (search + LLM verdict in v0.2) → WS push.
4. Overlay renders within ~1-3s depending on LLM/search latency.

## Privacy & compliance
See `PRIVACY.md`. Defaults: `CONSENT_BANNER=true`, `MOCK_MODE=true`, no persistence of audio/transcripts unless user opts in. Future: local-only mode (Whisper + Ollama, no cloud).

## Scaling (v0.2+)
- Redis for meeting sessions, Postgres+pgvector for person memory + past meetings.
- Speaker diarization (Deepgram / Pyannote) → per-speaker profiles.
- CRM push (HubSpot/Salesforce), post-meeting brief generation.
