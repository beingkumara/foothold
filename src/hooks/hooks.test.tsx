import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useFocusTimer } from './useFocusTimer';
import { useShortcuts } from './useShortcuts';
import { applySettingsToDocument, useSettings } from './useSettings';
import { AnnouncerProvider, useAnnounce } from './useAnnouncer';
import { useAppStore } from './useAppStore';
import { DEFAULT_SETTINGS } from '../state/settings';
import { loadState } from '../lib/storage';

describe('useFocusTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('counts up, pauses, and flags the target', () => {
    let clock = 0;
    const now = () => clock;
    const { result } = renderHook(() => useFocusTimer(1000, now));
    act(() => {
      clock = 600;
      vi.advanceTimersByTime(250);
    });
    expect(result.current.elapsedMs).toBe(600);
    expect(result.current.reachedTarget).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    act(() => {
      clock = 5000;
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedMs).toBe(600);

    act(() => result.current.toggle());
    act(() => {
      clock = 5500;
      vi.advanceTimersByTime(250);
    });
    expect(result.current.elapsedMs).toBe(1100);
    expect(result.current.reachedTarget).toBe(true);

    act(() => result.current.reset());
    expect(result.current.elapsedMs).toBe(0);
  });
});

describe('useShortcuts', () => {
  test('fires mapped keys, ignores typing, modifiers and when disabled', () => {
    const d = vi.fn();
    const { rerender, unmount } = renderHook(({ on }) => useShortcuts({ d }, on), { initialProps: { on: true } });
    fireEvent.keyDown(window, { key: 'd' });
    expect(d).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(d).toHaveBeenCalledTimes(1);

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'd' });
    expect(d).toHaveBeenCalledTimes(1);
    input.remove();

    rerender({ on: false });
    fireEvent.keyDown(window, { key: 'd' });
    expect(d).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('settings', () => {
  test('applySettingsToDocument reflects settings as attributes', () => {
    const root = document.createElement('html');
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'dark', highContrast: true, comfortSpacing: true, textScale: 1.3 }, root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.hasAttribute('data-high-contrast')).toBe(true);
    expect(root.hasAttribute('data-comfort')).toBe(true);
    expect(root.style.getPropertyValue('--text-scale')).toBe('1.3');
    applySettingsToDocument(DEFAULT_SETTINGS, root);
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('data-high-contrast')).toBe(false);
  });

  test('useSettings merges patches and persists them', () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current[1]({ energy: 'low' }));
    expect(result.current[0].energy).toBe('low');
    expect(window.localStorage.getItem('foothold:settings:v1')).toContain('"energy":"low"');
  });
});

describe('useAppStore', () => {
  test('persists every change', () => {
    const { result } = renderHook(() => useAppStore());
    act(() =>
      result.current[1]({ type: 'addTask', title: 'T', steps: [{ text: 's', minutes: 1, energy: 'low' }], source: 'local', now: 1 }),
    );
    expect(loadState().tasks[0].title).toBe('T');
  });
});

describe('AnnouncerProvider', () => {
  test('writes messages into the polite live region', async () => {
    vi.useFakeTimers();
    function Speaker() {
      const announce = useAnnounce();
      return <button onClick={() => announce('Hello there')}>say</button>;
    }
    render(
      <AnnouncerProvider>
        <Speaker />
      </AnnouncerProvider>,
    );
    fireEvent.click(screen.getByText('say'));
    act(() => vi.advanceTimersByTime(20));
    expect(screen.getByTestId('announcer')).toHaveTextContent('Hello there');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId('announcer')).toHaveTextContent('');
    vi.useRealTimers();
  });
});
