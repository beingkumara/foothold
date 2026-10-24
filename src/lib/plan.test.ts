import { planFromDump } from './plan';

describe('planFromDump', () => {
  test('plans every line offline when no key is set', async () => {
    const ai = vi.fn();
    const result = await planFromDump('email Sam\nclean kitchen', '', ai);
    expect(result.tasks.map((t) => t.title)).toEqual(['email Sam', 'clean kitchen']);
    expect(result.tasks.every((t) => t.source === 'local')).toBe(true);
    expect(ai).not.toHaveBeenCalled();
  });

  test('uses AI when a key is set', async () => {
    const ai = vi.fn().mockResolvedValue([
      { text: 'a', minutes: 1, energy: 'low' },
      { text: 'b', minutes: 2, energy: 'low' },
    ]);
    const result = await planFromDump('essay', 'gsk_x', ai);
    expect(result.tasks[0].source).toBe('ai');
    expect(result.fallbackReason).toBeUndefined();
  });

  test('falls back to offline steps and reports why when AI fails', async () => {
    const ai = vi.fn().mockRejectedValue(new Error('Groq rejected the API key'));
    const result = await planFromDump('essay', 'gsk_x', ai);
    expect(result.tasks[0].source).toBe('local');
    expect(result.tasks[0].steps.length).toBeGreaterThan(2);
    expect(result.fallbackReason).toBe('Groq rejected the API key');
  });
});

test('sends at most MAX_AI_TASKS lines to AI and plans the rest offline', async () => {
  const ai = vi.fn().mockResolvedValue([
    { text: 'a', minutes: 1, energy: 'low' },
    { text: 'b', minutes: 2, energy: 'low' },
  ]);
  const dump = Array.from({ length: 10 }, (_, i) => `task ${i}`).join('\n');
  const result = await planFromDump(dump, 'gsk_x', ai);
  expect(ai).toHaveBeenCalledTimes(8);
  expect(result.tasks).toHaveLength(10);
  expect(result.tasks.filter((t) => t.source === 'local')).toHaveLength(2);
  expect(result.fallbackReason).toContain('first 8');
});

test('skips AI instantly when the device is offline', async () => {
  const ai = vi.fn();
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const result = await planFromDump('essay', 'gsk_x', ai);
  expect(ai).not.toHaveBeenCalled();
  expect(result.tasks[0].source).toBe('local');
  expect(result.fallbackReason).toContain('offline');
  spy.mockRestore();
});
