import { AI_MODELS, breakDownWithAI, extractSteps, looksLikeGroqKey, testAIKey } from './ai';

const STEPS = '[{"text":"Open the doc","minutes":1,"energy":"low"},{"text":"Write a line","minutes":5,"energy":"medium"}]';

const chat = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const status = (code: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: code, headers });

describe('extractSteps', () => {
  test('parses a bare array, an object wrapper, and fenced or chatty replies', () => {
    expect(extractSteps(STEPS)).toHaveLength(2);
    expect(extractSteps(`{"steps": ${STEPS}}`)).toHaveLength(2);
    expect(extractSteps('Sure!\n```json\n' + STEPS + '\n```')).toHaveLength(2);
  });

  test('rejects replies without a valid list', () => {
    expect(() => extractSteps('no list')).toThrow();
    expect(() => extractSteps('[{"text":"x","minutes":-1,"energy":"low"}]')).toThrow();
  });
});

describe('breakDownWithAI (Groq)', () => {
  test('sends an OpenAI-style chat request with a bearer key and returns parsed steps', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chat(`{"steps": ${STEPS}}`));
    const steps = await breakDownWithAI('Write essay', 'gsk_test', fetchMock);
    expect(steps[0].text).toBe('Open the doc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer gsk_test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe(AI_MODELS[0]);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain('Write essay');
  });

  test('falls through to the next model when one is retired or unknown', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(status(400, { error: { code: 'model_decommissioned' } }))
      .mockResolvedValueOnce(status(404, { error: { code: 'model_not_found' } }))
      .mockResolvedValueOnce(chat(STEPS));
    const steps = await breakDownWithAI('x', 'k', fetchMock, 0);
    expect(steps).toHaveLength(2);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).model)).toEqual([...AI_MODELS]);
  });

  test('explains a rejected key without trying other models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(401));
    await expect(breakDownWithAI('x', 'bad', fetchMock, 0)).rejects.toThrow('rejected the API key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('retries once after 429, honouring retry-after, then succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(429, {}, { 'retry-after': '0' })).mockResolvedValueOnce(chat(STEPS));
    expect(await breakDownWithAI('x', 'k', fetchMock, 0)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('gives up after one retry with a friendly message', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => status(429));
    await expect(breakDownWithAI('x', 'k', fetchMock, 0)).rejects.toThrow('busy');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('explains network failures and other HTTP errors', async () => {
    await expect(breakDownWithAI('x', 'k', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')), 0)).rejects.toThrow(
      "Couldn't reach the AI",
    );
    await expect(breakDownWithAI('x', 'k', vi.fn().mockResolvedValue(status(500)), 0)).rejects.toThrow('500');
  });
});

describe('testAIKey', () => {
  test('reports success and failure in plain words', async () => {
    expect(await testAIKey('k', vi.fn().mockResolvedValue(chat('ok')))).toEqual({ ok: true, message: expect.stringContaining('works') });
    expect(await testAIKey('k', vi.fn().mockResolvedValue(status(401)))).toEqual({
      ok: false,
      message: expect.stringContaining('rejected'),
    });
  });
});

describe('looksLikeGroqKey', () => {
  test('accepts Groq-shaped keys only', () => {
    expect(looksLikeGroqKey('gsk_' + 'a'.repeat(40))).toBe(true);
    expect(looksLikeGroqKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe(false);
  });
});

describe('model quirks (seen against the live Groq API)', () => {
  test('asks gpt-oss models for low reasoning effort, and only them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(status(404, { error: { code: 'model_not_found' } }))
      .mockResolvedValueOnce(status(404, { error: { code: 'model_not_found' } }))
      .mockResolvedValueOnce(chat(STEPS));
    await breakDownWithAI('x', 'k', fetchMock, 0);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    bodies.forEach((b) => expect(b.reasoning_effort).toBe(b.model.startsWith('openai/gpt-oss') ? 'low' : undefined));
  });

  test('moves to the next model when a reply is truncated or unparseable', async () => {
    const truncated = new Response(
      JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"steps": [{"text": "Open' } }] }),
      { status: 200 },
    );
    const fetchMock = vi.fn().mockResolvedValueOnce(truncated).mockResolvedValueOnce(chat('sorry, no idea')).mockResolvedValueOnce(chat(STEPS));
    expect(await breakDownWithAI('x', 'k', fetchMock, 0)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('fails clearly when every model gives an unusable reply', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => chat('no steps here'));
    await expect(breakDownWithAI('x', 'k', fetchMock, 0)).rejects.toThrow("couldn't produce usable steps");
  });
});
