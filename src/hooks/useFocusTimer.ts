import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 250;

export interface FocusTimer {
  readonly elapsedMs: number;
  readonly running: boolean;
  readonly reachedTarget: boolean;
  toggle: () => void;
  reset: () => void;
}

/** Counts UP toward a target instead of down — gentler for time-blindness and anxiety. */
export function useFocusTimer(targetMs: number, now: () => number = Date.now): FocusTimer {
  const [elapsedMs, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const startedAt = useRef(now());
  const banked = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = now();
    const id = setInterval(() => setElapsed(banked.current + now() - startedAt.current), TICK_MS);
    return () => {
      clearInterval(id);
      banked.current += now() - startedAt.current;
    };
  }, [running, now]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    banked.current = 0;
    startedAt.current = now();
    setElapsed(0);
  }, [now]);

  return { elapsedMs, running, reachedTarget: elapsedMs >= targetMs, toggle, reset };
}
