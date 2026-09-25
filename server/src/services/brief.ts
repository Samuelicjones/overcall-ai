// Post-meeting brief: summary + action items + follow-ups, Gemini-first.
import { activeProvider, completeText } from './llm.js';

export async function meetingBrief(transcript: string, people: { displayName: string; title?: string; company?: string }[]) {
  const clean = transcript.slice(-8000);
  if (activeProvider() !== 'mock') {
    try {
      const text = await completeText(
        'You write crisp post-meeting briefs. Return markdown with sections: ## Summary (3 bullets), ## Decisions, ## Action items (owner + task), ## Follow-up message (2-3 sentences, warm, specific). No fluff.',
        `PARTICIPANTS: ${people.map((p) => `${p.displayName}${p.title ? ` (${p.title}${p.company ? ` @ ${p.company}` : ''})` : ''}`).join(', ') || 'unknown'}\n\nTRANSCRIPT:\n${clean}`
      );
      if (text.trim()) return { brief: text, provider: activeProvider() };
    } catch (e) {
      console.error('brief LLM failed', e);
    }
  }
  return {
    brief: `## Summary\n- Discussed: ${clean.slice(0, 160)}...\n- (Add GEMINI_API_KEY for full AI briefs)\n\n## Decisions\n- None captured\n\n## Action items\n- [ ] You: send follow-up with one concrete next step\n\n## Follow-up message\n> Great speaking today — here's the one thing I'll send over...`,
    provider: 'mock' as const
  };
}
