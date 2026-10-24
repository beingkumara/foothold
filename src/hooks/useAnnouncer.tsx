import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Announce = (message: string, politeness?: 'polite' | 'assertive') => void;

const AnnouncerContext = createContext<Announce>(() => undefined);

const CLEAR_AFTER_MS = 4000;

/** One shared pair of ARIA live regions so screen readers hear every state change. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<{ text: string; politeness: 'polite' | 'assertive' } | null>(null);

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    // Messages sent in the same tick are merged, so "Done" + "Next: …" are both heard.
    const queued = pending.current;
    pending.current = {
      text: queued ? `${queued.text} ${message}` : message,
      politeness: queued?.politeness === 'assertive' ? 'assertive' : politeness,
    };
    if (queued) return;
    setPolite('');
    setAssertive('');
    requestAnimationFrame(() => {
      const next = pending.current;
      pending.current = null;
      if (!next) return;
      // A modal <dialog> makes the rest of the page inert, so speak from inside it when one is open.
      const local = document.querySelector<HTMLElement>('dialog[open] [data-dialog-announcer]');
      if (local) local.textContent = next.text;
      else (next.politeness === 'assertive' ? setAssertive : setPolite)(next.text);
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPolite('');
      setAssertive('');
      document.querySelectorAll<HTMLElement>('[data-dialog-announcer]').forEach((el) => (el.textContent = ''));
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
