# Privacy & Legal — MUST READ

Overcall AI sits on meetings. That makes it high-risk if misused. These rules are part of the design, not suggestions.

## 1. Consent
- Always announce the assistant at meeting start: "I'm using an AI notetaker to pull background and fact-checks."
- Keep `CONSENT_BANNER=true`. The overlay shows a consent reminder by default.
- Two-party / all-party consent states (e.g. California, Illinois, EU under GDPR) require explicit permission to transcribe. When in doubt, ask and don't record.

## 2. No scraping
- Do NOT scrape LinkedIn / Zoom / Meet HTML to harvest personal data at scale. It violates ToS and can get accounts banned + create legal exposure.
- Use official APIs: Proxycurl, RocketReach, People Data Labs, or profiles the participant shared. Manual paste is always allowed.

## 3. Data minimization
- Default: no audio stored, transcripts kept in memory only (rolling 3000 chars), no DB in v0.1.
- If you add persistence: encrypt at rest, per-workspace isolation, 30-day auto-delete, export/delete on request.

## 4. Transparency in-call
- Fact-check verdicts show sources. Never present `mock` results as verified — the UI labels mock vs live.
- Talking points are suggestions, not instructions. Don't read private profile details aloud without relevance ("I saw your salary history" = no).

## 5. Enterprise use
- SSO, audit logs, DPA, and region-pinned processing before selling to enterprises.
- Offer local-only mode (Whisper + Ollama) for regulated customers.

If you can't meet these, don't ship the feature.
