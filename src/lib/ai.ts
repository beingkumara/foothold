import { z } from 'zod';
import { ENERGY_LEVELS, type StepDraft } from './types';

/**
 * Optional smarter breakdowns using the user's own Claude API key, called
 * straight from the browser. The key never leaves this device except to
 * api.anthropic.com. If anything fails, callers fall back to the offline engine.
 */

export const CLAUDE_MODEL = 'claude-haiku-5-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `You help people with ADHD, executive dysfunction or low energy START tasks.
Break the user's task into 3-7 concrete, physical, unambiguous steps.
Rules:
- Step 1 must be tiny (1-2 minutes, energy "low") and doable immediately.
- Each step starts with a verb and is under 15 words.
- No moralising, no "just", no productivity jargon. Warm, plain language.
- energy is "low", "medium" or "high" = how much mental effort it takes.
- minutes is a realistic whole number.
Respond with ONLY a JSON array: [{"text": string, "minutes": number, "energy": "low"|"medium"|"high"}]`;

const draftsSchema = z
  .array(
    z.object({
      text: z.string().trim().min(1).max(200),
      minutes: z.number().int().positive().max(240),
      energy: z.enum(ENERGY_LEVELS),
    }),
  )
  .min(2)
  .max(8);

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

export const looksLikeClaudeKey = (key: string): boolean => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key.trim());

/** Pull the first JSON array out of a model reply (tolerates code fences or prose). */
export function extractSteps(reply: string): readonly StepDraft[] {
  const start = reply.indexOf('[');
  const end = reply.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No step list in reply');
  return draftsSchema.parse(JSON.parse(reply.slice(start, end + 1)));
}

export async function breakDownWithClaude(
  title: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly StepDraft[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Task: ${title.slice(0, 300)}` }],
      }),
    });
    if (!res.ok) {
      throw new Error(res.status === 401 ? 'Claude rejected the API key' : `Claude request failed (${res.status})`);
    }
    const body = responseSchema.parse(await res.json());
    const text = body.content.find((c) => c.type === 'text')?.text ?? '';
    return extractSteps(text);
  } finally {
    clearTimeout(timer);
  }
}
