import React, { useEffect, useRef, useState } from 'react';

const SERVER = 'http://localhost:8787';
const WS_URL = 'ws://localhost:8787/ws/stream';

interface Person {
  displayName: string; title?: string; company?: string; headline?: string;
  linkedinUrl?: string; talkingPoints?: string[];
}
interface TP { id: string; text: string; relevance: string; }
interface FC { claim: string; verdict: string; explanation: string; sources: { title: string; url: string }[]; }

export function App() {
  const [roster, setRoster] = useState('Ada Lovelace, Grace Hopper');
  const [people, setPeople] = useState<Person[]>([]);
  const [points, setPoints] = useState<TP[]>([]);
  const [checks, setChecks] = useState<FC[]>([]);
  const [caption, setCaption] = useState('');
  const [status, setStatus] = useState('disconnected');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const sock = new WebSocket(WS_URL);
    ws.current = sock;
    sock.onopen = () => setStatus('live');
    sock.onclose = () => setStatus('disconnected');
    sock.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'talking-points') setPoints((p) => [...msg.payload, ...p].slice(0, 8));
      if (msg.type === 'fact-check') setChecks((c) => [msg.payload, ...c].slice(0, 5));
    };
    return () => sock.close();
  }, []);

  async function enrichRoster() {
    const participants = roster.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean).map((displayName) => ({ displayName }));
    const res = await fetch(`${SERVER}/api/people/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants })
    });
    const data = await res.json();
    setPeople(data.people ?? []);
  }

  function pushCaption(final = true) {
    if (!caption.trim() || ws.current?.readyState !== 1) return;
    ws.current.send(JSON.stringify({
      type: 'transcript', meetingId: 'demo-meeting',
      payload: { speaker: 'Them', text: caption, isFinal: final, timestamp: new Date().toISOString(), meetingId: 'demo-meeting' }
    }));
    setCaption('');
  }

  async function factCheckNow(text: string) {
    if (!text.trim()) return;
    const res = await fetch(`${SERVER}/api/fact-check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: text })
    });
    const fc = await res.json();
    setChecks((c) => [fc, ...c].slice(0, 5));
  }

  return (
    <div>
      <div className="consent">
        ⚠️ Get consent before using on live calls. Announce "Overcall AI is taking notes." <span className="small">Ctrl+Shift+O to interact • Ctrl+Shift+H to hide</span>
        <span className="pill blue" style={{ marginLeft: 8 }}>{status}</span>
      </div>

      <div className="card">
        <b>👥 Who's on this call?</b>
        <div className="small">Paste roster from Zoom/Meet, then Enrich.</div>
        <textarea value={roster} onChange={(e) => setRoster(e.target.value)} rows={2} style={{ width: '100%', marginTop: 8 }} />
        <button onClick={enrichRoster} style={{ marginTop: 8 }}>Enrich roster</button>
        {people.map((p) => (
          <div key={p.displayName} style={{ marginTop: 10 }}>
            <b>{p.displayName}</b> <span className="small">{p.title} @ {p.company}</span><br />
            <span className="small">{p.headline}</span><br />
            {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" className="small">LinkedIn ↗</a>}
            {(p.talkingPoints ?? []).map((t) => <div key={t} className="small">💡 {t}</div>)}
          </div>
        ))}
      </div>

      <div className="card">
        <b>🎙️ Live captions → intel</b>
        <div className="small">Paste what was just said (Meet captions / Whisper / Deepgram stub).</div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} style={{ width: '100%', marginTop: 8 }} placeholder='e.g. We grew revenue 240% last quarter...' />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => pushCaption(true)}>Send to AI</button>
          <button onClick={() => factCheckNow(caption)} style={{ background: '#059669' }}>Fact-check</button>
        </div>
      </div>

      {points.length > 0 && (
        <div className="card">
          <b>💡 Talking points (live)</b>
          {points.map((t) => <div key={t.id} style={{ marginTop: 6 }}>• {t.text}<div className="small">{t.relevance}</div></div>)}
        </div>
      )}

      {checks.length > 0 && (
        <div className="card">
          <b>✅ Fact-checks</b>
          {checks.map((f, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              <span className={`pill ${f.verdict === 'verified' ? 'green' : f.verdict === 'disputed' ? 'red' : 'yellow'}`}>{f.verdict}</span>
              <span className="small">"{f.claim}"</span>
              <div className="small">{f.explanation}</div>
              {f.sources?.map((s) => <div key={s.url} className="small">↗ <a href={s.url} target="_blank">{s.title}</a></div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
