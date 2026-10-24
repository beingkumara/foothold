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

const RETRY_STATUSES = new Set([429, 529]);
const MAX_RETRY_DELAY_MS = 2000;

const friendlyStatus = (status: number): string => {
  if (status === 401) return 'Claude rejected the API key';
  if (status === 403) return 'This API key is not allowed to use Claude';
  if (status === 429 || status === 529) return 'Claude is busy right now';
  if (status === 400 || status === 404) return `Claude could not run this request (${status})`;
  return `Claude request failed (${status})`;
};

async function callClaude(
  apiKey: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
  retryDelayMs: number,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Claude timed out');
      throw new Error("Couldn't reach Claude (are you offline?)");
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) return res;
    // One polite retry for rate limits and overload, honouring retry-after (capped).
    if (attempt === 0 && RETRY_STATUSES.has(res.status)) {
      const header = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(header) && header > 0 ? Math.min(header * 1000, MAX_RETRY_DELAY_MS) : retryDelayMs;
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }
    throw new Error(friendlyStatus(res.status));
  }
}

export async function breakDownWithClaude(
  title: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  retryDelayMs = 1000,
): Promise<readonly StepDraft[]> {
  const res = await callClaude(
    apiKey,
    {
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Task: ${title.slice(0, 300)}` }],
    },
    fetchImpl,
    retryDelayMs,
  );
  const body = responseSchema.parse(await res.json());
  const text = body.content.find((c) => c.type === 'text')?.text ?? '';
  return extractSteps(text);
}

export interface KeyCheck {
  readonly ok: boolean;
  readonly message: string;
}

/** A tiny, cheap request so people (and judges) know right away whether their key works. */
export async function testClaudeKey(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<KeyCheck> {
  try {
    await callClaude(
      apiKey,
      { model: CLAUDE_MODEL, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] },
      fetchImpl,
      1000,
    );
    return { ok: true, message: `Your key works. New plans will be written by ${CLAUDE_MODEL}.` };
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : 'Claude could not be reached.' };
  }
}
