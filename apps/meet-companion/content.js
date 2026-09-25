// Overcall AI Meet Companion — observes Meet captions + roster, forwards to local server.
// IMPORTANT: announce the assistant on the call. Only runs on meet.google.com when you enable it.
(() => {
  const SERVER = 'http://localhost:8787';
  let enabled = false;
  let lastSent = '';
  let lastTime = 0;

  chrome.storage?.local.get('enabled', (d) => { enabled = !!d.enabled; });

  chrome.storage?.onChanged.addListener((changes) => {
    if (changes.enabled) enabled = !!changes.enabled.newValue;
  });

  function roster() {
    // Meet participant names appear in aria-labels / data-participant-id nodes; be defensive.
    const names = new Set();
    document.querySelectorAll('[data-participant-id], [data-self-name]').forEach((el) => {
      const t = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (t && t.length < 60 && !/mute|more|pin/i.test(t)) names.add(t.split('\n')[0]);
    });
    return [...names].slice(0, 20);
  }

  async function sendTranscript(speaker, text) {
    try {
      // Reuse the WS protocol via a tiny inline socket
      await fetch(`${SERVER}/api/talking-points`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: `${speaker}: ${text}`, people: [] })
      }).catch(() => {});
      // Primary path: open WS once and reuse
      getSocket().send(JSON.stringify({
        type: 'transcript', meetingId: 'meet-live',
        payload: { speaker, text, isFinal: true, timestamp: new Date().toISOString(), meetingId: 'meet-live' }
      }));
    } catch { /* server may be down */ }
  }

  let sock = null;
  function getSocket() {
    if (sock && sock.readyState === 1) return sock;
    sock = new WebSocket(SERVER.replace(/^http/, 'ws') + '/ws/stream');
    // Send roster on open
    sock.onopen = () => {
      const people = roster().map((displayName) => ({ displayName }));
      if (people.length) sock.send(JSON.stringify({ type: 'roster', meetingId: 'meet-live', payload: { people } }));
    };
    return sock;
  }

  // Poll captions DOM (Meet renders captions in divs with specific roles)
  setInterval(() => {
    if (!enabled) return;
    const nodes = document.querySelectorAll('[aria-live="polite"] div, div[jsname="dsyhDe"]');
    const text = [...nodes].map((n) => n.textContent?.trim()).filter(Boolean).join(' ').slice(-500);
    const now = Date.now();
    if (text && text !== lastSent && now - lastTime > 5000 && text.split(' ').length > 4) {
      lastSent = text;
      lastTime = now;
      // Speaker heuristic: "Name: words" prefix if present
      const m = text.match(/^([^:]{2,40}):\s*(.*)$/);
      sendTranscript(m ? m[1] : 'Them', m ? m[2] : text);
    }
  }, 2000);
})();
