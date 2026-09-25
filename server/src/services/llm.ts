// Unified LLM layer — Gemini first, OpenAI / Anthropic / Ollama supported, mock fallback.
// Env:
//   LLM_PROVIDER=gemini | openai | anthropic | ollama  (default: gemini if GEMINI_API_KEY set, else openai, else mock)
//   GEMINI_API_KEY=...        (get one free at https://aistudio.google.com)
//   LLM_MODEL=gemini-2.0-flash (default for gemini)
//   OPENAI_API_KEY=..., ANTHROPIC_API_KEY=..., OLLAMA_URL=http://localhost:11434

export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'mock';

export function activeProvider(): LLMProvider {
  const explicit = (process.env.LLM_PROVIDER ?? '').toLowerCase() as LLMProvider;
  if (explicit === 'gemini' || explicit === 'openai' || explicit === 'anthropic' || explicit === 'ollama') return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

export function activeModel(): string {
  if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
  switch (activeProvider()) {
    case 'gemini': return 'gemini-2.0-flash';
    case 'openai': return 'gpt-4o-mini';
    case 'anthropic': return 'claude-3-5-haiku-latest';
    case 'ollama': return 'llama3.1';
    default: return 'mock';
  }
}

export function providerStatus() {
  return {
    provider: activeProvider(),
    model: activeModel(),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    search: {
      tavily: Boolean(process.env.TAVILY_API_KEY),
      brave: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      exa: Boolean(process.env.EXA_API_KEY)
    },
    enrichment: {
      proxycurl: Boolean(process.env.PROXYCURL_API_KEY),
      rocketreach: Boolean(process.env.ROCKETREACH_API_KEY),
      pdl: Boolean(process.env.PEOPLE_DATA_LABS_API_KEY)
    },
    transcription: { deepgram: Boolean(process.env.DEEPGRAM_API_KEY) },
    mockMode: activeProvider() === 'mock'
  };
}

/** Generate JSON from the LLM. Always returns parsed object or throws — callers fall back to templates. */
export async function completeJSON(system: string, user: string): Promise<any> {
  const provider = activeProvider();
  const model = activeModel();

  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const m = genAI.getGenerativeModel({
      model,
      generationConfig: { responseMimeType: 'application/json' } as any
    });
    const res = await m.generateContent(`${system}\n\n---\n\n${user}`);
    const text = res.response.text();
    return JSON.parse(text.replace(/^```json\n?|```$/g, '').trim());
  }

  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  }

  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: `${user}\n\nReply with JSON only.` }]
    });
    const text = msg.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
    return JSON.parse(text.replace(/^```json\n?|```$/g, '').trim());
  }

  if (provider === 'ollama') {
    const base = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        format: 'json',
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) throw new Error(`ollama error ${res.status}`);
    const data: any = await res.json();
    return JSON.parse(data.message?.content ?? '{}');
  }

  throw new Error('no LLM configured (mock mode)');
}

/** Plain-text completion (for summaries / briefs). */
export async function completeText(system: string, user: string): Promise<string> {
  const provider = activeProvider();
  const model = activeModel();

  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const m = genAI.getGenerativeModel({ model });
    const res = await m.generateContent(`${system}\n\n---\n\n${user}`);
    return res.response.text();
  }
  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    return completion.choices[0]?.message?.content ?? '';
  }
  // Reuse JSON path for others, then stringify
  const json = await completeJSON(system, `${user}\n\nReply as {"text": "..."} JSON.`);
  return typeof json === 'string' ? json : json.text ?? JSON.stringify(json);
}
