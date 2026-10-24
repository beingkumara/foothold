import { breakDownWithClaude, extractSteps, looksLikeClaudeKey } from './ai';

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
    await expect(breakDownWithClaude('x', 'k', reply('', 529))).rejects.toThrow('529');
  });
});

describe('looksLikeClaudeKey', () => {
  test('accepts Anthropic-shaped keys only', () => {
    expect(looksLikeClaudeKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(looksLikeClaudeKey('sk-proj-abc')).toBe(false);
  });
});
