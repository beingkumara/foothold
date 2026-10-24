import { breakDownWithClaude, extractSteps, looksLikeClaudeKey, testClaudeKey } from './ai';

const reply = (text: string, status = 200) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

const STEPS = '[{"text":"Open the doc","minutes":1,"energy":"low"},{"text":"Write a line","minutes":5,"energy":"medium"}]';

describe('extractSteps', () => {
  test('parses a bare array and one wrapped in prose or fences', () => {
    expect(extractSteps(STEPS)).toHaveLength(2);
    expect(extractSteps('Sure!\n```json\n' + STEPS + '\n```')).toHaveLength(2);
  });

  test('rejects replies without a valid list', () => {
    expect(() => extractSteps('no list')).toThrow();
    expect(() => extractSteps('[{"text":"x","minutes":-1,"energy":"low"}]')).toThrow();
  });
});

describe('breakDownWithClaude', () => {
  test('sends the browser-access headers and returns parsed steps', async () => {
    const fetchMock = reply(STEPS);
    const steps = await breakDownWithClaude('Write essay', 'sk-ant-test', fetchMock);
    expect(steps[0].text).toBe('Open the doc');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(init.headers['x-api-key']).toBe('sk-ant-test');
  });

  test('explains a rejected key', async () => {
    await expect(breakDownWithClaude('x', 'bad', reply('', 401))).rejects.toThrow('rejected the API key');
  });

  test('surfaces other HTTP failures', async () => {
    await expect(breakDownWithClaude('x', 'k', reply('', 500))).rejects.toThrow('500');
  });
});

describe('looksLikeClaudeKey', () => {
  test('accepts Anthropic-shaped keys only', () => {
    expect(looksLikeClaudeKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(looksLikeClaudeKey('sk-proj-abc')).toBe(false);
  });
});

describe('resilience', () => {
  const ok = () =>
    new Response(JSON.stringify({ content: [{ type: 'text', text: STEPS }] }), { status: 200 });
  const status = (code: number, headers: Record<string, string> = {}) => new Response('{}', { status: code, headers });

  test('retries once after 429 or 529, then succeeds', async () => {
    for (const code of [429, 529]) {
      const fetchMock = vi.fn().mockResolvedValueOnce(status(code, { 'retry-after': '0' })).mockResolvedValueOnce(ok());
      const steps = await breakDownWithClaude('x', 'k', fetchMock, 0);
      expect(steps).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  test('gives up after one retry with a friendly message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(529));
    await expect(breakDownWithClaude('x', 'k', fetchMock, 0)).rejects.toThrow('Claude is busy right now');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('explains network failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(breakDownWithClaude('x', 'k', fetchMock, 0)).rejects.toThrow("Couldn't reach Claude");
  });

  test('testClaudeKey reports success and failure in plain words', async () => {
    expect(await testClaudeKey('k', vi.fn().mockResolvedValue(ok()))).toEqual({ ok: true, message: expect.stringContaining('works') });
    expect(await testClaudeKey('k', vi.fn().mockResolvedValue(status(401)))).toEqual({
      ok: false,
      message: expect.stringContaining('rejected'),
    });
  });
});
