import { EMPTY_STATE, pickNextStep, progress, reducer, winsToday, type AppState } from './tasks';
import type { StepDraft } from '../lib/types';

const drafts: readonly StepDraft[] = [
  { text: 'tiny', minutes: 1, energy: 'low' },
  { text: 'medium', minutes: 10, energy: 'medium' },
  { text: 'hard', minutes: 30, energy: 'high' },
];

const add = (state: AppState, title: string, now: number, steps = drafts): AppState =>
  reducer(state, { type: 'addTask', title, steps, source: 'local', now });

describe('reducer', () => {
  test('addTask appends a task with fresh step ids and does not mutate input', () => {
    const before = EMPTY_STATE;
    const after = add(before, '  Essay  ', 1);
    expect(before.tasks).toHaveLength(0);
    expect(after.tasks).toHaveLength(1);
    expect(after.tasks[0].title).toBe('Essay');
    expect(new Set(after.tasks[0].steps.map((s) => s.id)).size).toBe(3);
    expect(after.tasks[0].steps.every((s) => !s.done)).toBe(true);
  });

  test('completeStep marks done, logs a win and is idempotent', () => {
    const s1 = add(EMPTY_STATE, 'Essay', 1);
    const task = s1.tasks[0];
    const s2 = reducer(s1, { type: 'completeStep', taskId: task.id, stepId: task.steps[0].id, now: 5 });
    expect(s2.tasks[0].steps[0].done).toBe(true);
    expect(s2.tasks[0].steps[0].doneAt).toBe(5);
    expect(s2.wins).toHaveLength(1);
    expect(s1.tasks[0].steps[0].done).toBe(false);
    const s3 = reducer(s2, { type: 'completeStep', taskId: task.id, stepId: task.steps[0].id, now: 6 });
    expect(s3).toBe(s2);
  });

  test('finishing the last step marks the task done with an extra win; undo clears it', () => {
    let s = add(EMPTY_STATE, 'Essay', 1);
    const task = s.tasks[0];
    for (const st of task.steps) s = reducer(s, { type: 'completeStep', taskId: task.id, stepId: st.id, now: 9 });
    expect(s.tasks[0].doneAt).toBe(9);
    expect(s.wins.some((w) => w.text === 'Finished: Essay')).toBe(true);
    s = reducer(s, { type: 'uncompleteStep', taskId: task.id, stepId: task.steps[2].id });
    expect(s.tasks[0].doneAt).toBeUndefined();
    expect(s.tasks[0].steps[2].done).toBe(false);
  });

  test('replaceStep swaps one step for several in place', () => {
    const s1 = add(EMPTY_STATE, 'Essay', 1);
    const task = s1.tasks[0];
    const s2 = reducer(s1, {
      type: 'replaceStep',
      taskId: task.id,
      stepId: task.steps[1].id,
      steps: [
        { text: 'a', minutes: 1, energy: 'low' },
        { text: 'b', minutes: 2, energy: 'low' },
      ],
    });
    expect(s2.tasks[0].steps.map((s) => s.text)).toEqual(['tiny', 'a', 'b', 'hard']);
  });

  test('editStep ignores blank text', () => {
    const s1 = add(EMPTY_STATE, 'Essay', 1);
    const { id, steps } = s1.tasks[0];
    expect(reducer(s1, { type: 'editStep', taskId: id, stepId: steps[0].id, text: '  ' })).toBe(s1);
    const s2 = reducer(s1, { type: 'editStep', taskId: id, stepId: steps[0].id, text: ' new ' });
    expect(s2.tasks[0].steps[0].text).toBe('new');
  });

  test('toggleToday, removeTask, skip and clearSkips', () => {
    let s = add(EMPTY_STATE, 'A', 1);
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'toggleToday', taskId: id });
    expect(s.tasks[0].today).toBe(true);
    s = reducer(s, { type: 'skipStep', stepId: 'x' });
    expect(reducer(s, { type: 'skipStep', stepId: 'x' })).toBe(s);
    s = reducer(s, { type: 'clearSkips' });
    expect(s.skipped).toEqual([]);
    s = reducer(s, { type: 'removeTask', taskId: id });
    expect(s.tasks).toHaveLength(0);
  });

  test('replaceAll swaps the whole state', () => {
    const next = add(EMPTY_STATE, 'A', 1);
    expect(reducer(EMPTY_STATE, { type: 'replaceAll', state: next })).toBe(next);
  });
});

describe('pickNextStep', () => {
  test('returns null when nothing to do', () => {
    expect(pickNextStep(EMPTY_STATE, 'high')).toBeNull();
  });

  test('prefers today-flagged tasks, then in-progress, then oldest', () => {
    let s = add(EMPTY_STATE, 'Old', 1);
    s = add(s, 'Newer', 2);
    s = add(s, 'Newest', 3);
    expect(pickNextStep(s, 'high')?.task.title).toBe('Old');

    const newer = s.tasks[1];
    s = reducer(s, { type: 'completeStep', taskId: newer.id, stepId: newer.steps[0].id, now: 4 });
    expect(pickNextStep(s, 'high')?.task.title).toBe('Newer');

    s = reducer(s, { type: 'toggleToday', taskId: s.tasks[2].id });
    expect(pickNextStep(s, 'high')?.task.title).toBe('Newest');
  });

  test('respects energy and flags a stretch when nothing fits', () => {
    let s = add(EMPTY_STATE, 'Hard', 1, [{ text: 'big', minutes: 30, energy: 'high' }]);
    s = add(s, 'Medium', 2, [{ text: 'mid', minutes: 10, energy: 'medium' }]);
    expect(pickNextStep(s, 'medium')).toMatchObject({ step: { text: 'mid' }, stretch: false });
    expect(pickNextStep(s, 'low')).toMatchObject({ step: { text: 'mid' }, stretch: true });
  });

  test('skips steps the user deferred', () => {
    let s = add(EMPTY_STATE, 'A', 1);
    s = add(s, 'B', 2);
    s = reducer(s, { type: 'skipStep', stepId: s.tasks[0].steps[0].id });
    expect(pickNextStep(s, 'high')?.task.title).toBe('B');
  });
});

describe('helpers', () => {
  test('progress counts done steps', () => {
    let s = add(EMPTY_STATE, 'A', 1);
    const t = s.tasks[0];
    s = reducer(s, { type: 'completeStep', taskId: t.id, stepId: t.steps[0].id, now: 2 });
    expect(progress(s.tasks[0])).toEqual({ done: 1, total: 3 });
  });

  test('winsToday counts only wins since local midnight', () => {
    const now = new Date(2026, 9, 24, 15, 0).getTime();
    const yesterday = new Date(2026, 9, 23, 23, 0).getTime();
    expect(
      winsToday(
        [
          { id: '1', text: 'a', at: now - 1000 },
          { id: '2', text: 'b', at: yesterday },
        ],
        now,
      ),
    ).toBe(1);
  });
});

describe('limits that protect saved data', () => {
  test('clamps long titles and step text so persisted state always validates', () => {
    const s = add(EMPTY_STATE, 'x'.repeat(2000), 1, [{ text: 'y'.repeat(900), minutes: 0.4, energy: 'low' }]);
    expect(s.tasks[0].title.length).toBe(300);
    expect(s.tasks[0].steps[0].text.length).toBe(300);
    expect(s.tasks[0].steps[0].minutes).toBe(1);
  });

  test('replaceStep refuses to grow a plan past the step cap', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ text: `s${i}`, minutes: 1, energy: 'low' as const }));
    const s = add(EMPTY_STATE, 'big', 1, many);
    const t = s.tasks[0];
    const next = reducer(s, { type: 'replaceStep', taskId: t.id, stepId: t.steps[0].id, steps: drafts });
    expect(next).toBe(s);
    expect(reducer(s, { type: 'replaceStep', taskId: 'missing', stepId: 'x', steps: drafts })).toBe(s);
  });
});
