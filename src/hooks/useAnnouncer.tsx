import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Announce = (message: string, politeness?: 'polite' | 'assertive') => void;

const AnnouncerContext = createContext<Announce>(() => undefined);

const CLEAR_AFTER_MS = 4000;

/** One shared pair of ARIA live regions so screen readers hear every state change. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite;
    // Clear first so repeating the same message is still announced.
    set('');
    requestAnimationFrame(() => set(message));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPolite('');
      setAssertive('');
    }, CLEAR_AFTER_MS);
  }, []);

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {polite}
      </div>
      <div className="visually-hidden" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnounce = (): Announce => useContext(AnnouncerContext);
