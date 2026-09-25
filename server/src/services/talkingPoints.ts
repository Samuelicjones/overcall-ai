// Talking-points engine — LLM when keys exist, smart template fallback otherwise.
import OpenAI from 'openai';

interface PersonCtx {
  displayName: string;
  title?: string;
  company?: string;
  summary?: string;
}

export async function talkingPointsFor(transcript: string, people: PersonCtx[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const model = process.env.LLM_MODEL ?? 'gpt-4o-mini';
      const peopleStr = people.length
        ? people.map((p) => `- ${p.displayName}${p.title ? `, ${p.title}` : ''}${p.company ? ` @ ${p.company}` : ''}${p.summary ? `: ${p.summary}` : ''}`).join('\n')
        : 'No enriched profiles yet.';
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are Overcall AI, a meeting copilot. Given the live transcript and participant bios, output 3 concise, high-leverage talking points or questions. Each ≤20 words. No fluff. Return JSON array of {text, relevance}.'
          },
          { role: 'user', content: `PARTICIPANTS:\n${peopleStr}\n\nTRANSCRIPT (last ~3000 chars):\n${transcript.slice(-3000)}` }
        ],
        response_format: { type: 'json_object' }
      });
      const raw = completion.choices[0]?.message?.content ?? '{"points":[]}';
      const parsed: any = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : parsed.points ?? [];
      return arr.slice(0, 3).map((p: any, i: number) => ({
        id: `tp-${Date.now()}-${i}`,
        text: String(p.text ?? p),
        relevance: String(p.relevance ?? 'Live transcript + profile match'),
        createdAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('LLM talking-points failed, using fallback', e);
    }
  }

  // Fallback: extract keywords + tailor to people
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
