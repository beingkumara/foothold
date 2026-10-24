import { formatClock, formatMinutes, spokenDuration } from './format';

test('formatMinutes', () => {
  expect(formatMinutes(5)).toBe('5 min');
  expect(formatMinutes(60)).toBe('1 h');
  expect(formatMinutes(90)).toBe('1 h 30 min');
});

test('formatClock pads seconds and clamps negatives', () => {
  expect(formatClock(65_000)).toBe('1:05');
  expect(formatClock(-5)).toBe('0:00');
});

test('spokenDuration reads naturally', () => {
  expect(spokenDuration(0)).toBe('0 seconds');
  expect(spokenDuration(1000)).toBe('1 second');
  expect(spokenDuration(60_000)).toBe('1 minute');
  expect(spokenDuration(125_000)).toBe('2 minutes 5 seconds');
});
