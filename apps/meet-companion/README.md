# Meet Companion (Chrome, optional)

Auto-forwards Google Meet captions + roster to Overcall AI. No bots, no recordings — it reads the captions **you already see**.

## Install (2 min)
1. Open `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select `apps/meet-companion/`
3. Click the ⚡ icon → ✅ Enable on Meet
4. Start your local server (`npm run dev:server`) + overlay
5. Join a Meet, turn captions on (**CC** button), announce the assistant

## How it works
- `content.js` polls the captions DOM every 2s, sends final chunks over `ws://localhost:8787/ws/stream`
- Roster is scraped from participant nodes on socket open and sent as `{type:'roster'}`
- Server personalizes talking points + fact-checks, overlay renders them

## Limitations
- Meet changes its DOM often — if captions stop flowing, update the selectors in `content.js`
- Zoom/Teams need their SDKs (see ROADMAP) — meanwhile use overlay **Mic (free)** button or paste captions
