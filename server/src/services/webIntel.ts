// Web intel: live search (Tavily → Brave → Exa → mock) + LLM fact-check verdicts (Gemini-first).
import { activeProvider, completeJSON } from './llm.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  // 1) Tavily (best for AI + citations)
  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 5, search_depth: 'advanced' })
      });
      if (res.ok) {
        const data: any = await res.json();
        const out = (data.results ?? []).map((r: any) => ({
          title: r.title, url: r.url, snippet: (r.content ?? '').slice(0, 300)
        }));
        if (out.length) return out;
      }
    } catch (e) {
      console.error('tavily failed', e);
    }
  }

  // 2) Brave Search
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY }
      });
      if (res.ok) {
        const data: any = await res.json();
        const out = (data.web?.results ?? []).map((r: any) => ({
          title: r.title, url: r.url, snippet: (r.description ?? '').slice(0, 300)
        }));
        if (out.length) return out;
      }
    } catch (e) {
      console.error('brave failed', e);
    }
  }

  // 3) Exa (neural search)
  if (process.env.EXA_API_KEY) {
    try {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXA_API_KEY },
        body: JSON.stringify({ query, numResults: 5, useAutoprompt: true })
      });
      if (res.ok) {
        const data: any = await res.json();
        const out = (data.results ?? []).map((r: any) => ({
          title: r.title ?? r.url, url: r.url, snippet: (r.text ?? r.snippet ?? '').slice(0, 300)
        }));
        if (out.length) return out;
      }
    } catch (e) {
      console.error('exa failed', e);
    }
  }

  // 4) Mock fallback so UI works day one
  return [
    { title: `"${query}" — top result (mock)`, url: 'https://example.com/result-1', snippet: `Mock snippet for "${query}". Add TAVILY_API_KEY (or Brave/Exa) for live results.` },
    { title: `"${query}" — background (mock)`, url: 'https://example.com/result-2', snippet: 'Second mock result with context you would cite in-call.' }
  ];
}

export type Verdict = 'verified' | 'disputed' | 'unverifiable' | 'needs-context';

export async function factCheckClaim(claim: string) {
  const results = await webSearch(`fact check: ${claim}`);
  const liveSearch = Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_API_KEY || process.env.EXA_API_KEY);

  // LLM verdict when a provider is configured (Gemini default)
  if (activeProvider() !== 'mock') {
    try {
      const evidence = results.map((r, i) => `[${i + 1}] ${r.title} (${r.url}): ${r.snippet}`).join('\n');
      const parsed: any = await completeJSON(
        'You are a careful fact-checker. Given a CLAIM and web EVIDENCE, return {"verdict": "verified|disputed|unverifiable|needs-context", "explanation": "<=40 words, cite [1]/[2] numbers>"}.\nRules: verified only with a primary/credible source directly supporting it. disputed if evidence contradicts. needs-context for numbers/dates lacking a primary source. Otherwise unverifiable.',
        `CLAIM: ${claim}\n\nEVIDENCE:\n${evidence}\n\nLive search: ${liveSearch ? 'yes' : 'no (mock evidence — be conservative)'}.`
      );
      const verdict = (['verified', 'disputed', 'unverifiable', 'needs-context'] as Verdict[]).includes(parsed.verdict)
        ? parsed.verdict
        : 'unverifiable';
      return {
        id: `fc-${Date.now()}`,
        claim,
        verdict,
        explanation: String(parsed.explanation ?? 'See sources.'),
        sources: results.slice(0, 3),
        createdAt: new Date().toISOString()
      };
    } catch (e) {
      console.error('LLM fact-check failed, using heuristic', e);
    }
  }

  // Heuristic fallback
  const hasNumbers = /\d+%|\$\d+|\b\d{4}\b/.test(claim);
  return {
    id: `fc-${Date.now()}`,
    claim,
    verdict: (hasNumbers ? 'needs-context' : 'unverifiable') as Verdict,
    explanation: liveSearch
      ? 'Checked via live web search (heuristic — add GEMINI_API_KEY for AI verdicts). Numbers/dates need a primary source before you repeat them.'
      : 'Mock search (add TAVILY_API_KEY for live + GEMINI_API_KEY for AI verdicts). Treat numbers/dates as unverified.',
    sources: results.slice(0, 3),
    createdAt: new Date().toISOString()
  };
}
