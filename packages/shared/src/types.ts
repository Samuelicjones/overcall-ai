export interface PersonProfile {
  id: string;
  displayName: string;
  email?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  headline?: string;
  location?: string;
  summary?: string;
  experience?: { title: string; company: string; years?: string }[];
  mutuals?: string[];
  talkingPoints?: string[];
  source: 'mock' | 'proxycurl' | 'rocketreach' | 'pdl' | 'manual';
  lastEnrichedAt: string;
}

export interface TranscriptChunk {
  speaker: string;
  text: string;
  timestamp: string;
  meetingId: string;
  isFinal: boolean;
}

export interface TalkingPoint {
  id: string;
  text: string;
  relevance: string;
  forPerson?: string;
  sourceUrls?: string[];
  createdAt: string;
}

export interface FactCheck {
  id: string;
  claim: string;
  verdict: 'verified' | 'disputed' | 'unverifiable' | 'needs-context';
  explanation: string;
  sources: { title: string; url: string; snippet: string }[];
  createdAt: string;
}

export interface EnrichRequest {
  displayName: string;
  email?: string;
  linkedinUrl?: string;
  companyHint?: string;
}

export interface StreamClientMessage {
  type: 'transcript' | 'roster' | 'ping';
  meetingId: string;
  payload: TranscriptChunk | { participants: string[] } | Record<string, never>;
}

export interface StreamServerMessage {
  type: 'talking-points' | 'fact-check' | 'people-update' | 'pong';
  payload: TalkingPoint[] | FactCheck | PersonProfile[] | Record<string, never>;
}
