import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import './dialog.css';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'sheet' | 'immersive';
  hideTitle?: boolean;
}

/**
 * Native <dialog> gives us a focus trap, Escape-to-close, inert background and
 * top-layer rendering for free. Focus returns to the opener on close.
 */
export function Dialog({ open, title, onClose, children, variant = 'sheet', hideTitle = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      if (opener.current instanceof HTMLElement) opener.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog__body">
          <header className="dialog__header">
            <h2 id={titleId} className={hideTitle ? 'visually-hidden' : 'dialog__title'}>
              {title}
            </h2>
            <button type="button" className="btn btn--icon btn--quiet dialog__close" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
