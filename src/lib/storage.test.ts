import { loadState, parseImport, saveState, serializeExport, STATE_KEY, readJson } from './storage';
import { EMPTY_STATE, reducer } from '../state/tasks';
import { z } from 'zod';

const sample = reducer(EMPTY_STATE, {
  type: 'addTask',
  title: 'Essay',
  steps: [{ text: 'open doc', minutes: 1, energy: 'low' }],
  source: 'local',
  now: 1,
});

beforeEach(() => window.localStorage.clear());

describe('storage', () => {
  test('round-trips state through localStorage', () => {
    expect(saveState(sample)).toBe(true);
    expect(loadState()).toEqual(sample);
  });

  test('falls back to empty state on corrupt or invalid data', () => {
    window.localStorage.setItem(STATE_KEY, '{not json');
    expect(loadState()).toEqual(EMPTY_STATE);
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ tasks: [{ id: 1 }] }));
    expect(loadState()).toEqual(EMPTY_STATE);
  });

  test('readJson survives a throwing storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readJson('k', z.number(), 7)).toBe(7);
    spy.mockRestore();
  });

  test('export then import yields the same state', () => {
    const result = parseImport(serializeExport(sample));
    expect(result).toEqual({ ok: true, state: sample });
  });

  test('import rejects non-JSON and foreign files with friendly errors', () => {
    expect(parseImport('nope')).toEqual({ ok: false, error: 'That file is not valid JSON.' });
    expect(parseImport('{"hello":1}')).toEqual({ ok: false, error: 'That file does not look like a Foothold backup.' });
  });
});
