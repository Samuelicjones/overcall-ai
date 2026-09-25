// People resolver — NEVER scrape LinkedIn HTML directly.
// Priority: 1) explicit linkedinUrl via Proxycurl 2) email via RocketReach/PDL 3) mock fallback.
// Plug your provider keys in .env. Mock mode lets the overlay work without keys.

interface EnrichInput {
  displayName: string;
  email?: string;
  linkedinUrl?: string;
  companyHint?: string;
}

const MOCK_MODE = process.env.MOCK_MODE !== 'false';

export async function enrichPerson(input: EnrichInput) {
  const { displayName, email, linkedinUrl, companyHint } = input;

  // 1) Proxycurl (LinkedIn profile API) — https://nubela.co/proxycurl
  if (process.env.PROXYCURL_API_KEY && linkedinUrl) {
    try {
      const res = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
        { headers: { Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}` } }
      );
      if (res.ok) {
        const p: any = await res.json();
        return {
          id: email ?? linkedinUrl!,
          displayName: p.full_name ?? displayName,
          title: p.occupation ?? p.headline,
          company: p.experiences?.[0]?.company,
          linkedinUrl,
          headline: p.headline,
          location: p.city ? `${p.city}, ${p.country ?? ''}` : undefined,
          summary: p.summary,
          experience: (p.experiences ?? []).slice(0, 3).map((e: any) => ({ title: e.title, company: e.company })),
          source: 'proxycurl' as const,
          lastEnrichedAt: new Date().toISOString(),
          talkingPoints: talkingPointsFromProfile(p.headline, p.summary)
        };
      }
    } catch (e) {
      console.error('proxycurl failed, falling back', e);
    }
  }

  // 2) TODO: RocketReach / PDL by email — same shape, source: 'rocketreach'
  // 3) Mock fallback — realistic so UI can be built today
  void MOCK_MODE;
  return {
    id: email ?? displayName.toLowerCase().replace(/\s+/g, '.'),
    displayName,
    email,
    company: companyHint ?? 'Acme Corp',
    title: 'VP of Engineering',
    linkedinUrl: linkedinUrl ?? `https://www.linkedin.com/in/${displayName.toLowerCase().replace(/\s+/g, '-')}`,
    headline: `${displayName} — VP Eng @ ${companyHint ?? 'Acme Corp'} | ex-Stripe | Hiring AI engineers`,
    location: 'San Francisco Bay Area',
    summary: `${displayName} leads platform engineering. Previously at Stripe. Posts about AI infra and hiring.`,
    experience: [
      { title: 'VP of Engineering', company: companyHint ?? 'Acme Corp' },
      { title: 'Senior Engineer', company: 'Stripe' }
    ],
    mutuals: ['You both follow Lenny Rachitsky', '2nd-degree via Sarah Chen'],
    talkingPoints: [
      `Ask about scaling ${companyHint ?? 'Acme Corp'}'s platform team — they posted about it last week`,
      `Congratulate on the recent funding / launch (verify via search first)`,
      `Shared interest: AI infra cost optimization`
    ],
    source: 'mock' as const,
    lastEnrichedAt: new Date().toISOString()
  };
}

function talkingPointsFromProfile(headline?: string, summary?: string): string[] {
  const pts: string[] = [];
  if (headline) pts.push(`Their headline: "${headline}" — ask what they're focused on there now`);
  if (summary) pts.push('Reference one concrete detail from their summary, not generic flattery');
  pts.push('Ask what success looks like for them in the next 90 days');
  return pts.slice(0, 3);
}
