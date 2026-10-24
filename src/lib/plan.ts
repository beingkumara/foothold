import { breakDownWithClaude } from './ai';
import { breakDown, splitCompound } from './breakdown';
import type { StepDraft, StepSource } from './types';

export interface PlannedTask {
  readonly title: string;
  readonly steps: readonly StepDraft[];
  readonly source: StepSource;
}

export interface PlanResult {
  readonly tasks: readonly PlannedTask[];
  /** Set when Claude was requested but we fell back to the offline engine. */
  readonly fallbackReason?: string;
}

type ClaudeFn = typeof breakDownWithClaude;

/** Keeps a big paste from firing dozens of parallel API calls. */
export const MAX_AI_TASKS = 8;

/** Brain dump → one plan per line. Claude is optional; offline breakdown is the safety net. */
export async function planFromDump(dump: string, apiKey: string, claude: ClaudeFn = breakDownWithClaude): Promise<PlanResult> {
  const titles = splitCompound(dump);
  if (!apiKey.trim()) {
    return { tasks: titles.map((title) => ({ title, steps: breakDown(title), source: 'local' })) };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      tasks: titles.map((title) => ({ title, steps: breakDown(title), source: 'local' })),
      fallbackReason: "you're offline",
    };
  }

  let fallbackReason: string | undefined;
  const aiTitles = titles.slice(0, MAX_AI_TASKS);
  const extra = titles.slice(MAX_AI_TASKS).map((title): PlannedTask => ({ title, steps: breakDown(title), source: 'local' }));
  if (extra.length > 0) fallbackReason = `only the first ${MAX_AI_TASKS} lines are sent to Claude`;
  const aiTasks = await Promise.all(
    aiTitles.map(async (title): Promise<PlannedTask> => {
      try {
        return { title, steps: await claude(title, apiKey), source: 'ai' };
      } catch (error: unknown) {
        fallbackReason = error instanceof Error ? error.message : 'Claude was unavailable';
        return { title, steps: breakDown(title), source: 'local' };
      }
    }),
  );
  const tasks = [...aiTasks, ...extra];
  return fallbackReason ? { tasks, fallbackReason } : { tasks };
}
