// Talking-points engine — Gemini-first via unified LLM layer, template fallback in mock mode.
import { activeProvider, completeJSON } from './llm.js';

export interface PersonCtx {
  displayName: string;
  title?: string;
  company?: string;
  summary?: string;
}

export async function talkingPointsFor(transcript: string, people: PersonCtx[]) {
  const provider = activeProvider();
  if (provider !== 'mock') {
    try {
      const peopleStr = people.length
        ? people.map((p) => `- ${p.displayName}${p.title ? `, ${p.title}` : ''}${p.company ? ` @ ${p.company}` : ''}${p.summary ? `: ${p.summary}` : ''}`).join('\n')
        : 'No enriched profiles yet.';
      const parsed: any = await completeJSON(
        'You are Overcall AI, a meeting copilot. Given the live transcript and participant bios, output 3 concise, high-leverage talking points or questions. Each max 20 words. No fluff, no generic flattery. Return {"points": [{"text": "...", "relevance": "..."}]}.',
        `PARTICIPANTS:\n${peopleStr}\n\nTRANSCRIPT (last ~3000 chars):\n${transcript.slice(-3000)}`
      );
      const arr = Array.isArray(parsed) ? parsed : parsed.points ?? [];
      if (arr.length) {
        return arr.slice(0, 3).map((p: any, i: number) => ({
          id: `tp-${Date.now()}-${i}`,
          text: String(p.text ?? p),
          relevance: String(p.relevance ?? 'Live transcript + profile match'),
          forPerson: people[0]?.displayName,
          createdAt: new Date().toISOString()
        }));
      }
    } catch (e) {
      console.error(`LLM talking-points failed (${provider}), using fallback`, e);
    }
  }

  // Fallback: extract keywords + tailor to people (works with zero keys)
  const keywords = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 5)
    .slice(-6);
  const topic = keywords.slice(-3).join(' ') || 'their current priorities';
  return [
    {
      id: `tp-${Date.now()}-0`,
      text: `Bridge to "${topic}": "How does that affect your roadmap this quarter?"`,
      relevance: 'Keeps conversation on what they just said',
      createdAt: new Date().toISOString()
    },
    {
      id: `tp-${Date.now()}-1`,
      text: people[0]?.company
        ? `Tie it to ${people[0].company}: "Is that similar to what you're seeing at ${people[0].company}?"`
        : 'Ask: "What does success look like for you in the next 90 days?"',
      relevance: 'Personalized to participant company',
      forPerson: people[0]?.displayName,
      createdAt: new Date().toISOString()
    },
    {
      id: `tp-${Date.now()}-2`,
      text: 'Offer proof, not pitch: "We helped a similar team cut that cost 30% — want the 2-min version?"',
      relevance: 'Social proof without derailing',
      createdAt: new Date().toISOString()
    }
  ];
}
