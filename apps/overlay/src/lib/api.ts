export const SERVER = localStorage.getItem('overcall.server') ?? 'http://localhost:8787';
export const WS_URL = SERVER.replace(/^http/, 'ws') + '/ws/stream';

export function saveServer(url: string) {
  localStorage.setItem('overcall.server', url);
}

export async function getConfig() {
  const res = await fetch(`${SERVER}/api/config`);
  if (!res.ok) throw new Error('server unreachable');
  return res.json();
}

export async function enrichBatch(names: string[]) {
  const participants = names.map((displayName) => ({ displayName }));
  const res = await fetch(`${SERVER}/api/people/batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants })
  });
  if (!res.ok) throw new Error('enrich failed');
  return res.json();
}

export async function factCheck(claim: string) {
  const res = await fetch(`${SERVER}/api/fact-check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim })
  });
  if (!res.ok) throw new Error('fact-check failed');
  return res.json();
}

export async function search(query: string) {
  const res = await fetch(`${SERVER}/api/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('search failed');
  return res.json();
}

export async function brief(transcript: string, people: any[]) {
  const res = await fetch(`${SERVER}/api/brief`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, people })
  });
  if (!res.ok) throw new Error('brief failed');
  return res.json();
}
