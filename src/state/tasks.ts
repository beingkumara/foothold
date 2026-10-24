import { energyRank, type Energy, type Step, type StepDraft, type StepSource, type Task, type Win } from '../lib/types';

export interface AppState {
  readonly tasks: readonly Task[];
  readonly wins: readonly Win[];
  /** Steps the user said "not now" to, so the picker offers something else. */
  readonly skipped: readonly string[];
}

export const EMPTY_STATE: AppState = { tasks: [], wins: [], skipped: [] };

export type Action =
  | { type: 'addTask'; title: string; steps: readonly StepDraft[]; source: StepSource; now: number }
  | { type: 'removeTask'; taskId: string }
  | { type: 'toggleToday'; taskId: string }
  | { type: 'completeStep'; taskId: string; stepId: string; now: number }
  | { type: 'uncompleteStep'; taskId: string; stepId: string }
  | { type: 'replaceStep'; taskId: string; stepId: string; steps: readonly StepDraft[] }
  | { type: 'editStep'; taskId: string; stepId: string; text: string }
  | { type: 'skipStep'; stepId: string }
  | { type: 'clearSkips' }
  | { type: 'replaceAll'; state: AppState };

let counter = 0;
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// Limits mirror the persisted zod schema so nothing we store can fail validation on reload.
export const MAX_TITLE = 300;
export const MAX_STEP_TEXT = 300;
export const MAX_STEPS = 40;

const toSteps = (drafts: readonly StepDraft[]): readonly Step[] =>
  drafts.map((d) => ({
    ...d,
    text: d.text.slice(0, MAX_STEP_TEXT),
    minutes: Math.min(600, Math.max(1, Math.round(d.minutes))),
    id: newId(),
    done: false,
  }));

const updateTask = (state: AppState, taskId: string, fn: (task: Task) => Task): AppState => ({
  ...state,
  tasks: state.tasks.map((t) => (t.id === taskId ? fn(t) : t)),
});

const withCompletion = (task: Task, now: number): Task => {
  const allDone = task.steps.length > 0 && task.steps.every((s) => s.done);
  if (allDone && task.doneAt === undefined) return { ...task, doneAt: now };
  if (!allDone && task.doneAt !== undefined) {
    const { doneAt: _ignored, ...rest } = task;
    return rest;
  }
  return task;
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addTask': {
      const task: Task = {
        id: newId(),
        title: action.title.trim().slice(0, MAX_TITLE),
        steps: toSteps(action.steps),
        createdAt: action.now,
        today: false,
        source: action.source,
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'removeTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.taskId) };
    case 'toggleToday':
      return updateTask(state, action.taskId, (t) => ({ ...t, today: !t.today }));
    case 'completeStep': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      const target = task?.steps.find((s) => s.id === action.stepId);
      if (!task || !target || target.done) return state;
      const next = updateTask(state, action.taskId, (t) =>
        withCompletion(
          { ...t, steps: t.steps.map((s) => (s.id === action.stepId ? { ...s, done: true, doneAt: action.now } : s)) },
          action.now,
        ),
      );
      const finishedTask = next.tasks.find((t) => t.id === action.taskId);
      const wins: Win[] = [{ id: newId(), text: target.text, at: action.now }];
      if (finishedTask?.doneAt !== undefined) {
        wins.push({ id: newId(), text: `Finished: ${task.title}`, at: action.now });
      }
      return { ...next, wins: [...wins, ...next.wins], skipped: next.skipped.filter((id) => id !== action.stepId) };
    }
    case 'uncompleteStep':
      return updateTask(state, action.taskId, (t) =>
        withCompletion(
          {
            ...t,
            steps: t.steps.map((s) => {
              if (s.id !== action.stepId) return s;
              const { doneAt: _ignored, ...rest } = s;
              return { ...rest, done: false };
            }),
          },
          0,
        ),
      );
    case 'replaceStep':
      {
        const target = state.tasks.find((t) => t.id === action.taskId);
        if (!target || target.steps.length + action.steps.length - 1 > MAX_STEPS) return state;
      }
      return updateTask(state, action.taskId, (t) => ({
        ...t,
        steps: t.steps.flatMap((s) => (s.id === action.stepId ? toSteps(action.steps) : [s])),
      }));
    case 'editStep': {
      const text = action.text.trim();
      if (text.length === 0) return state;
      return updateTask(state, action.taskId, (t) => ({
        ...t,
        steps: t.steps.map((s) => (s.id === action.stepId ? { ...s, text } : s)),
      }));
    }
    case 'skipStep':
      return state.skipped.includes(action.stepId) ? state : { ...state, skipped: [...state.skipped, action.stepId] };
    case 'clearSkips':
      return { ...state, skipped: [] };
    case 'replaceAll':
      return action.state;
  }
}

export interface NextPick {
  readonly task: Task;
  readonly step: Step;
  /** True when nothing fits current energy and we fell back to the gentlest step. */
  readonly stretch: boolean;
}

/**
 * The heart of Foothold: choose ONE step to show.
 * Order: today-flagged tasks first, then tasks already in progress, then oldest.
 * Only the first unfinished step of each task is eligible, so plans stay in order.
 */
export function pickNextStep(state: AppState, energy: Energy): NextPick | null {
  const candidates = state.tasks
    .filter((t) => t.doneAt === undefined)
    .map((task) => ({ task, step: task.steps.find((s) => !s.done) }))
    .filter((c): c is { task: Task; step: Step } => c.step !== undefined)
    .filter((c) => !state.skipped.includes(c.step.id));

  if (candidates.length === 0) return null;

  const started = (t: Task): number => (t.steps.some((s) => s.done) ? 1 : 0);
  const ordered = [...candidates].sort(
    (a, b) =>
      Number(b.task.today) - Number(a.task.today) ||
      started(b.task) - started(a.task) ||
      a.task.createdAt - b.task.createdAt,
  );

  const fits = ordered.find((c) => energyRank(c.step.energy) <= energyRank(energy));
  if (fits) return { ...fits, stretch: false };

  const gentlest = [...ordered].sort(
    (a, b) => energyRank(a.step.energy) - energyRank(b.step.energy) || a.step.minutes - b.step.minutes,
  )[0];
  return { ...gentlest, stretch: true };
}

export const progress = (task: Task): { done: number; total: number } => ({
  done: task.steps.filter((s) => s.done).length,
  total: task.steps.length,
});

export const winsToday = (wins: readonly Win[], now: number): number => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return wins.filter((w) => w.at >= start.getTime()).length;
};
