import React, { useEffect, useRef, useState } from 'react';
import { SERVER, WS_URL, enrichBatch, factCheck, search, brief, getConfig, saveServer } from './lib/api';

interface Person {
  displayName: string; title?: string; company?: string; headline?: string;
  linkedinUrl?: string; talkingPoints?: string[]; summary?: string;
}
interface TP { id: string; text: string; relevance: string; forPerson?: string; }
interface FC { claim: string; verdict: string; explanation: string; sources: { title: string; url: string; snippet?: string }[]; }

type Tab = 'live' | 'people' | 'search' | 'brief' | 'settings';

export function App() {
  const [tab, setTab] = useState<Tab>('live');
  const [status, setStatus] = useState<'live' | 'disconnected' | 'connecting'>('connecting');
  const [config, setConfig] = useState<any>(null);
  const [configError, setConfigError] = useState('');
  const [roster, setRoster] = useState(() => localStorage.getItem('overcall.roster') ?? 'Ada Lovelace, Grace Hopper');
  const [people, setPeople] = useState<Person[]>(() => {
    try { return JSON.parse(localStorage.getItem('overcall.people') ?? '[]'); } catch { return []; }
  });
  const [points, setPoints] = useState<TP[]>([]);
  const [checks, setChecks] = useState<FC[]>([]);
  const [caption, setCaption] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [briefText, setBriefText] = useState('');
  const [busy, setBusy] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [serverUrl, setServerUrl] = useState(SERVER);
  const ws = useRef<WebSocket | null>(null);
  const recog = useRef<any>(null);

  // Connect WS (reconnect on failure)
  useEffect(() => {
    let dead = false;
    let sock: WebSocket;
    function connect() {
      setStatus('connecting');
      sock = new WebSocket(WS_URL);
      ws.current = sock;
      sock.onopen = () => !dead && setStatus('live');
      sock.onclose = () => { if (!dead) { setStatus('disconnected'); setTimeout(connect, 3000); } };
      sock.onerror = () => sock.close();
      sock.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'talking-points') setPoints((p) => [...msg.payload, ...p].slice(0, 10));
          if (msg.type === 'fact-check') setChecks((c) => [msg.payload, ...c].slice(0, 8));
        } catch { /* ignore */ }
      };
    }
    connect();
    return () => { dead = true; sock?.close(); };
  }, []);

  // Load provider config
  useEffect(() => {
    getConfig().then(setConfig).catch((e) => setConfigError(String(e.message ?? e)));
  }, []);

  function sendTranscript(speaker: string, text: string) {
    if (ws.current?.readyState !== 1 || !text.trim()) return;
    ws.current.send(JSON.stringify({
      type: 'transcript', meetingId: 'meeting-1',
      payload: { speaker, text, isFinal: true, timestamp: new Date().toISOString(), meetingId: 'meeting-1' }
    }));
    setHistory((h) => [`${speaker}: ${text}`, ...h].slice(0, 30));
  }

  async function doEnrich() {
    setBusy(true);
    try {
      localStorage.setItem('overcall.roster', roster);
      const names = roster.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
      const data = await enrichBatch(names);
      setPeople(data.people ?? []);
      localStorage.setItem('overcall.people', JSON.stringify(data.people ?? []));
      // Share roster context with server so talking points are personalized
      ws.current?.send(JSON.stringify({ type: 'roster', meetingId: 'meeting-1', payload: { people: data.people ?? [] } }));
    } catch (e: any) {
      alert(`Enrich failed — is the server running at ${SERVER}?`);
    } finally { setBusy(false); }
  }

  async function doFactCheck(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const fc = await factCheck(text);
      setChecks((c) => [fc, ...c].slice(0, 8));
      setTab('live');
    } catch { alert('Fact-check failed — check server.'); }
    finally { setBusy(false); }
  }

  async function doSearch() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const data = await search(query);
      setResults(data.results ?? []);
    } catch { alert('Search failed — add TAVILY_API_KEY for live results.'); }
    finally { setBusy(false); }
  }

  async function doBrief() {
    setBusy(true);
    try {
      const transcript = history.slice().reverse().join('\n') || caption;
      const data = await brief(transcript || '(no transcript yet — paste captions first)', people);
      setBriefText(data.brief ?? '');
    } catch { alert('Brief failed.'); }
    finally { setBusy(false); }
  }

  // Free mic transcription via Web Speech API (Chrome/Edge, no key needed)
  function toggleMic() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Mic transcription needs Chrome/Edge (Web Speech API). Paste captions instead.'); return; }
    if (micOn) { recog.current?.stop(); setMicOn(false); return; }
    const r = new SR();
    recog.current = r;
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (ev: any) => {
      const text = ev.results[ev.results.length - 1][0].transcript;
      sendTranscript('Them', text);
    };
    r.onend = () => { if (recog.current === r) { try { r.start(); } catch { setMicOn(false); } } };
    try { r.start(); setMicOn(true); } catch { setMicOn(false); }
  }

  const aiReady = config && (config.gemini || config.openai || config.anthropic);
  const searchReady = config && (config.search?.tavily || config.search?.brave || config.search?.exa);

  return (
    <div>
      <div className="topbar">
        <div className="logo">⚡ <span>Overcall AI</span></div>
        <div className="small"><span className={`dot ${status === 'live' ? 'live' : 'off'}`} />{status}</div>
      </div>

      <div className="consent">
        ⚠️ With consent only — announce “AI notetaker on”. <span className="kbd">Ctrl+Shift+O</span> interact · <span className="kbd">Ctrl+Shift+H</span> hide
      </div>

      {!aiReady && config && (
        <div className="card" style={{ borderColor: '#f59e0b' }}>
          <b>🔑 Add your Gemini key to unlock AI</b>
          <div className="small">Free at aistudio.google.com → <span className="kbd">GEMINI_API_KEY</span> in root <span className="kbd">.env</span>, restart server. Mock mode until then.</div>
        </div>
      )}

      <div className="tabs">
        {(['live', 'people', 'search', 'brief', 'settings'] as Tab[]).map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'live' ? '● Live' : t[0].toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === 'live' && (
        <>
          <div className="card">
            <b>🎙️ What was just said?</b>
            <div className="small">Paste a caption, use mic (free), or install the Meet companion.</div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2}
              placeholder='e.g. We grew revenue 240% last quarter...' style={{ marginTop: 8 }} />
            <div className="btnrow">
              <button disabled={busy || !caption.trim()} onClick={() => { sendTranscript('Them', caption); setCaption(''); }}>Send to AI</button>
              <button className="danger" disabled={busy || !caption.trim()} onClick={() => doFactCheck(caption)}>Fact-check</button>
              <button className={`secondary ${micOn ? 'mic-on' : ''}`} onClick={toggleMic}>{micOn ? '● Stop mic' : '○ Mic (free)'}</button>
            </div>
          </div>

          {points.length > 0 && (
            <div className="card"><b>💡 Say this next</b>
              {points.map((t) => <div key={t.id} className="feed-item">• {t.text}<div className="small">{t.relevance}{t.forPerson ? ` · for ${t.forPerson}` : ''}</div></div>)}
            </div>
          )}

          <div className="card"><b>✅ Fact-checks</b>
            {checks.length === 0 && <div className="small">None yet — claims with 8+ words auto-check live.</div>}
            {checks.map((f, i) => (
              <div key={i} className="feed-item">
                <span className={`pill ${f.verdict === 'verified' ? 'green' : f.verdict === 'disputed' ? 'red' : f.verdict === 'needs-context' ? 'yellow' : 'gray'}`}>{f.verdict}</span>
                <span className="small">“{f.claim}”</span>
                <div className="small">{f.explanation}</div>
                {f.sources?.map((s) => <div key={s.url} className="small">↗ <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></div>)}
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <div className="card"><b>📝 Transcript (this session)</b>
              {history.slice(0, 6).map((h, i) => <div key={i} className="small" style={{ marginTop: 4 }}>{h}</div>)}
              <div className="btnrow"><button className="secondary" onClick={() => { setTab('brief'); doBrief(); }}>Generate brief →</button></div>
            </div>
          )}
        </>
      )}

      {tab === 'people' && (
        <div className="card">
          <b>👥 Who's on this call?</b>
          <div className="small">Paste roster from Zoom/Meet participants, then Enrich.</div>
          <textarea value={roster} onChange={(e) => setRoster(e.target.value)} rows={2} style={{ marginTop: 8 }} />
          <div className="btnrow"><button disabled={busy} onClick={doEnrich}>{busy ? 'Enriching…' : 'Enrich roster'}</button></div>
          {people.map((p) => (
            <div key={p.displayName} className="person">
              <b>{p.displayName}</b> <span className="small">{p.title ?? ''}{p.company ? ` @ ${p.company}` : ''}</span><br />
              {p.headline && <span className="small">{p.headline}</span>}<br />
              {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="small">LinkedIn ↗</a>}
              {(p.talkingPoints ?? []).map((t) => <div key={t} className="small">💡 {t}</div>)}
            </div>
          ))}
          {people.length === 0 && <div className="small" style={{ marginTop: 8 }}>No one enriched yet.</div>}
        </div>
      )}

      {tab === 'search' && (
        <div className="card">
          <b>🔎 Live intel {!searchReady && <span className="pill yellow">mock</span>}</b>
          <div className="small">Pricing, competitors, news — without tab-switching.</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Acme Corp Series B amount"
              onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
            <button disabled={busy} onClick={doSearch} style={{ width: 'auto' }}>Go</button>
          </div>
          {results.map((r, i) => (
            <div key={i} className="feed-item">
              <a href={r.url} target="_blank" rel="noreferrer"><b>{r.title}</b></a>
              <div className="small">{r.snippet}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'brief' && (
        <div className="card">
          <b>📋 Meeting brief</b>
          <div className="btnrow"><button disabled={busy} onClick={doBrief}>{busy ? 'Writing…' : 'Generate from transcript'}</button></div>
          {briefText && <pre className="brief" style={{ marginTop: 8 }}>{briefText}</pre>}
          {!briefText && <div className="small" style={{ marginTop: 8 }}>Send some captions first, then generate.</div>}
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <b>⚙️ Settings & status</b>
          <div className="small" style={{ marginTop: 6 }}>Server</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            <button style={{ width: 'auto' }} onClick={() => { saveServer(serverUrl); location.reload(); }}>Save</button>
          </div>
          {configError && <div className="small" style={{ marginTop: 8 }}>⚠️ {configError} — start server: <span className="kbd">npm run dev:server</span></div>}
          {config && (
            <div className="small" style={{ marginTop: 8, lineHeight: 1.8 }}>
              LLM: <b>{config.provider}</b> ({config.model}) {config.mockMode ? '· mock mode' : '· live'}<br />
              Keys — Gemini: {config.gemini ? '✅' : '❌'} · OpenAI: {config.openai ? '✅' : '❌'} · Search: {(config.search?.tavily || config.search?.brave || config.search?.exa) ? '✅' : '❌ (mock)'}<br />
              <br />To enable AI:<br />1. Get free key at <b>aistudio.google.com</b><br />2. Put <span className="kbd">GEMINI_API_KEY=…</span> in <span className="kbd">.env</span><br />3. Restart server
            </div>
          )}
          <div className="btnrow">
            <button className="secondary" onClick={() => { localStorage.clear(); location.reload(); }}>Reset overlay</button>
          </div>
        </div>
      )}
    </div>
  );
}
