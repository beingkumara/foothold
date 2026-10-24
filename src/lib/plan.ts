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

/** Brain dump → one plan per line. Claude is optional; offline breakdown is the safety net. */
export async function planFromDump(dump: string, apiKey: string, claude: ClaudeFn = breakDownWithClaude): Promise<PlanResult> {
  const titles = splitCompound(dump);
  if (!apiKey.trim()) {
    return { tasks: titles.map((title) => ({ title, steps: breakDown(title), source: 'local' })) };
  }

  let fallbackReason: string | undefined;
  const tasks = await Promise.all(
    titles.map(async (title): Promise<PlannedTask> => {
      try {
        return { title, steps: await claude(title, apiKey), source: 'ai' };
      } catch (error: unknown) {
        fallbackReason = error instanceof Error ? error.message : 'Claude was unavailable';
        return { title, steps: breakDown(title), source: 'local' };
      }
    }),
  );
  return fallbackReason ? { tasks, fallbackReason } : { tasks };
}
