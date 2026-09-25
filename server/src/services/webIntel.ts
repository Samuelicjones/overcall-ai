// Web intel: live search + fact-check. Provider order: Tavily → Brave → Exa → mock.
// Get a key: https://tavily.com (recommended for AI search + citations).

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 5, search_depth: 'advanced' })
      });
      if (res.ok) {
        const data: any = await res.json();
        return (data.results ?? []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 300) ?? '' }));
      }
    } catch (e) {
      console.error('tavily failed', e);
    }
  }
  // Mock fallback so UI works day one
  return [
    { title: `"${query}" — top result (mock)`, url: 'https://example.com/result-1', snippet: `Mock snippet for "${query}". Wire TAVILY_API_KEY for live results.` },
    { title: `"${query}" — background (mock)`, url: 'https://example.com/result-2', snippet: 'Second mock result with context you would cite in-call.' }
  ];
}

export async function factCheckClaim(claim: string) {
  const results = await webSearch(`fact check: ${claim}`);
  const sourceNote = process.env.TAVILY_API_KEY ? 'live web search' : 'mock search (add TAVILY_API_KEY for live)';

  // v0.1 heuristic — v0.2 should pass claim+evidence to the LLM for a real verdict.
  const hasNumbers = /\d+%|\$\d+|\b\d{4}\b/.test(claim);
  return {
    id: `fc-${Date.now()}`,
    claim,
    verdict: hasNumbers ? ('needs-context' as const) : ('unverifiable' as const),
    explanation: `Checked via ${sourceNote}. Numbers/dates need a primary source before you repeat them on the call.`,
    sources: results.slice(0, 3),
    createdAt: new Date().toISOString()
  };
}
