import { breakDown, shrinkStep, splitCompound } from './breakdown';

describe('breakDown', () => {
  test('always starts with a tiny low-energy foothold step', () => {
    const steps = breakDown('Write my history essay');
    expect(steps[0].energy).toBe('low');
    expect(steps[0].minutes).toBeLessThanOrEqual(2);
  });

  test('uses a writing template for essay-like tasks', () => {
    const steps = breakDown('Write my history essay');
    const text = steps.map((s) => s.text.toLowerCase()).join(' ');
    expect(text).toContain('outline');
  });

  test('uses an email template for messages', () => {
    const steps = breakDown('Reply to email from landlord');
    expect(steps.some((s) => /subject|reply|send/i.test(s.text))).toBe(true);
  });

  test('uses a cleaning template for tidying tasks', () => {
    const steps = breakDown('Clean the kitchen');
    expect(steps.some((s) => /surface|dishes|trash/i.test(s.text))).toBe(true);
  });

  test('weaves the subject into generic steps for unknown tasks', () => {
    const steps = breakDown('Fix the bike tyre');
    expect(steps.some((s) => s.text.includes('bike tyre'))).toBe(true);
  });

  test('every step has positive minutes and a valid energy', () => {
    const inputs = ['Do taxes', 'study for chemistry exam', 'call the dentist', 'buy groceries', 'xyz'];
    for (const input of inputs) {
      for (const step of breakDown(input)) {
        expect(step.minutes).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(step.energy);
        expect(step.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('returns between 3 and 7 steps so the list never overwhelms', () => {
    for (const input of ['Write report', 'laundry', 'apply for passport', 'random thing']) {
      const n = breakDown(input).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  test('throws on empty input', () => {
    expect(() => breakDown('   ')).toThrow();
  });
});

describe('shrinkStep', () => {
  test('turns one step into smaller, lower-effort steps', () => {
    const smaller = shrinkStep({ text: 'Write the introduction', minutes: 20, energy: 'high' });
    expect(smaller.length).toBeGreaterThanOrEqual(2);
    expect(smaller.every((s) => s.minutes < 20)).toBe(true);
    expect(smaller[0].energy).toBe('low');
    expect(smaller.some((s) => s.text.toLowerCase().includes('introduction'))).toBe(true);
  });
});

describe('splitCompound', () => {
  test('splits brain dumps on new lines, semicolons and " and then "', () => {
    expect(splitCompound('email Sam\nbuy milk; call mum and then do laundry')).toEqual([
      'email Sam',
      'buy milk',
      'call mum',
      'do laundry',
    ]);
  });

  test('drops blank fragments and bullet markers', () => {
    expect(splitCompound('- one\n\n* two\n  ')).toEqual(['one', 'two']);
  });
});
