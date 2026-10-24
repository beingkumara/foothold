import { z } from 'zod';
import { ENERGY_LEVELS, type StepDraft } from './types';

/**
 * Optional smarter breakdowns with the user's own free Groq API key, called
 * straight from the browser (Groq's API allows cross-origin requests). The key
 * never leaves this device except to api.groq.com. If anything fails, callers
 * fall back to the offline engine.
 */

export const AI_PROVIDER = 'Groq';
/**
 * Tried in order. Groq retires models over time (the Llama 3.x models were gone by Oct 2026),
 * so a missing model, or one that returns an unusable reply, falls through to the next.
 */
export const AI_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] as const;
const MAX_COMPLETION_TOKENS = 1200;

/** gpt-oss models reason before answering; at default effort they can spend the whole budget thinking. */
const modelOptions = (model: string): Record<string, unknown> =>
  model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {};
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `You help people with ADHD, executive dysfunction or low energy START tasks.
Break the user's task into 3-7 concrete, physical, unambiguous steps.
Rules:
- Step 1 must be tiny (1-2 minutes, energy "low") and doable immediately.
- Each step starts with a verb and is under 15 words.
- No moralising, no "just", no productivity jargon. Warm, plain language.
- energy is "low", "medium" or "high" = how much mental effort it takes.
- minutes is a realistic whole number.
Respond with ONLY JSON: {"steps": [{"text": string, "minutes": number, "energy": "low"|"medium"|"high"}]}`;

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
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({ content: z.string().nullable().optional() }),
      }),
    )
    .min(1),
});

export const looksLikeGroqKey = (key: string): boolean => /^gsk_[A-Za-z0-9]{20,}$/.test(key.trim());

/** Pull the step list out of a model reply (tolerates an object wrapper, code fences or prose). */
export function extractSteps(reply: string): readonly StepDraft[] {
  const start = reply.indexOf('[');
  const end = reply.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No step list in reply');
  return draftsSchema.parse(JSON.parse(reply.slice(start, end + 1)));
}

const RETRY_STATUSES = new Set([429, 503]);
const MAX_RETRY_DELAY_MS = 2000;

const friendlyStatus = (status: number): string => {
  if (status === 401) return `${AI_PROVIDER} rejected the API key`;
  if (status === 403) return `This API key is not allowed to use ${AI_PROVIDER}`;
  if (RETRY_STATUSES.has(status)) return `${AI_PROVIDER} is busy right now`;
  return `${AI_PROVIDER} request failed (${status})`;
};

/** A model that no longer exists: try the next one instead of failing. */
async function isRetiredModel(res: Response): Promise<boolean> {
  if (res.status === 404) return true;
  if (res.status !== 400) return false;
  try {
    const body = (await res.clone().json()) as { error?: { code?: string } };
    return ['model_decommissioned', 'model_not_found'].includes(body.error?.code ?? '');
  } catch {
    return false;
  }
}

async function post(apiKey: string, body: Record<string, unknown>, fetchImpl: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetchImpl(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey.trim()}` },
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error(`${AI_PROVIDER} timed out`);
    throw new Error("Couldn't reach the AI (are you offline?)");
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown when a model answered but the reply can't be used; the caller tries the next model. */
class UnusableReply extends Error {}

/** One call to one model, with one polite retry on rate limits. Resolves the reply text, or null if the model is gone. */
async function chatOnce(
  model: string,
  apiKey: string,
  messages: ReadonlyArray<{ role: string; content: string }>,
  maxTokens: number,
  fetchImpl: typeof fetch,
  retryDelayMs: number,
): Promise<string | null> {
  const body = { model, messages, temperature: 0.4, max_completion_tokens: maxTokens, ...modelOptions(model) };
  let res = await post(apiKey, body, fetchImpl);
  if (RETRY_STATUSES.has(res.status)) {
    const header = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(header) && header > 0 ? Math.min(header * 1000, MAX_RETRY_DELAY_MS) : retryDelayMs;
    await new Promise((resolve) => setTimeout(resolve, wait));
    res = await post(apiKey, body, fetchImpl);
  }
  if (res.ok) {
    const choice = responseSchema.parse(await res.json()).choices[0];
    if (choice.finish_reason === 'length') throw new UnusableReply('reply was cut off');
    return choice.message.content ?? '';
  }
  if (await isRetiredModel(res)) return null;
  throw new Error(friendlyStatus(res.status));
}

/** Walk the model list until one gives a reply that `use` accepts. Auth, rate-limit and network errors stop the walk. */
async function firstUsable<T>(
  apiKey: string,
  messages: ReadonlyArray<{ role: string; content: string }>,
  maxTokens: number,
  fetchImpl: typeof fetch,
  retryDelayMs: number,
  use: (reply: string) => T,
): Promise<T> {
  let answered = false;
  for (const model of AI_MODELS) {
    try {
      const reply = await chatOnce(model, apiKey, messages, maxTokens, fetchImpl, retryDelayMs);
      if (reply === null) continue;
      answered = true;
      return use(reply);
    } catch (error: unknown) {
      if (error instanceof UnusableReply || error instanceof z.ZodError || error instanceof SyntaxError || isNoSteps(error)) {
        answered = true;
        continue;
      }
      throw error;
    }
  }
  throw new Error(answered ? `${AI_PROVIDER} couldn't produce usable steps` : `None of ${AI_PROVIDER}'s models answered`);
}

const isNoSteps = (error: unknown): boolean => error instanceof Error && error.message === 'No step list in reply';

export async function breakDownWithAI(
  title: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  retryDelayMs = 1000,
): Promise<readonly StepDraft[]> {
  return firstUsable(
    apiKey,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Task: ${title.slice(0, 300)}` },
    ],
    MAX_COMPLETION_TOKENS,
    fetchImpl,
    retryDelayMs,
    extractSteps,
  );
}

export interface KeyCheck {
  readonly ok: boolean;
  readonly message: string;
}

/** A tiny request so people (and judges) know right away whether their key works. */
export async function testAIKey(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<KeyCheck> {
  try {
    await firstUsable(apiKey, [{ role: 'user', content: 'Reply with the word ok.' }], 200, fetchImpl, 1000, (reply) => reply);
    return { ok: true, message: `Your key works. New plans will be written by ${AI_PROVIDER}.` };
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : `${AI_PROVIDER} could not be reached.` };
  }
}
