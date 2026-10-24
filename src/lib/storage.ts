import { z } from 'zod';
import { ENERGY_LEVELS } from './types';
import { EMPTY_STATE, type AppState } from '../state/tasks';

/**
 * Everything lives in this browser only. Storage can be unavailable (private
 * mode, blocked site data), so every access is guarded and the app keeps
 * working in-memory if it fails.
 */

const energy = z.enum(ENERGY_LEVELS);

const stepSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(500),
  minutes: z.number().int().positive().max(600),
  energy,
  done: z.boolean(),
  doneAt: z.number().optional(),
});

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(300),
  steps: z.array(stepSchema).max(50),
  createdAt: z.number(),
  today: z.boolean(),
  source: z.enum(['local', 'ai']),
  doneAt: z.number().optional(),
});

const winSchema = z.object({ id: z.string(), text: z.string().max(600), at: z.number() });

export const appStateSchema = z.object({
  tasks: z.array(taskSchema).max(500),
  wins: z.array(winSchema).max(5000),
  skipped: z.array(z.string()).max(500).default([]),
});

export const EXPORT_VERSION = 1;
const exportSchema = z.object({ app: z.literal('foothold'), version: z.literal(EXPORT_VERSION), state: appStateSchema });

export function readJson<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const STATE_KEY = 'foothold:state:v1';

export function loadState(): AppState {
  const state = readJson<AppState | null>(STATE_KEY, appStateSchema, null);
  if (state) return state;
  // Never let an unreadable save be silently overwritten: keep a copy for recovery.
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw !== null) window.localStorage.setItem(`${STATE_KEY}:corrupt`, raw);
  } catch {
    // Storage unavailable; nothing to preserve.
  }
  return EMPTY_STATE;
}
export const saveState = (state: AppState): boolean => writeJson(STATE_KEY, state);

export const serializeExport = (state: AppState): string =>
  JSON.stringify({ app: 'foothold', version: EXPORT_VERSION, state }, null, 2);

export type ImportResult = { ok: true; state: AppState } | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const parsed = exportSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'That file does not look like a Foothold backup.' };
  }
  return { ok: true, state: parsed.data.state };
}
