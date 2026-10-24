import { planFromDump } from './plan';

describe('planFromDump', () => {
  test('plans every line offline when no key is set', async () => {
    const claude = vi.fn();
    const result = await planFromDump('email Sam\nclean kitchen', '', claude);
    expect(result.tasks.map((t) => t.title)).toEqual(['email Sam', 'clean kitchen']);
    expect(result.tasks.every((t) => t.source === 'local')).toBe(true);
    expect(claude).not.toHaveBeenCalled();
  });

  test('uses Claude when a key is set', async () => {
    const claude = vi.fn().mockResolvedValue([
      { text: 'a', minutes: 1, energy: 'low' },
      { text: 'b', minutes: 2, energy: 'low' },
    ]);
    const result = await planFromDump('essay', 'sk-ant-x', claude);
    expect(result.tasks[0].source).toBe('ai');
    expect(result.fallbackReason).toBeUndefined();
  });

  test('falls back to offline steps and reports why when Claude fails', async () => {
    const claude = vi.fn().mockRejectedValue(new Error('Claude rejected the API key'));
    const result = await planFromDump('essay', 'sk-ant-x', claude);
    expect(result.tasks[0].source).toBe('local');
    expect(result.tasks[0].steps.length).toBeGreaterThan(2);
    expect(result.fallbackReason).toBe('Claude rejected the API key');
  });
});
