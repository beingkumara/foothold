import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSpeechInput } from '../../hooks/useSpeechInput';
import { Icon } from '../ui/Icon';
import './capture.css';

export const EXAMPLE_TASKS = ['Reply to the email from my landlord', 'Clean the kitchen', 'Start my history essay'] as const;

interface CaptureBarProps {
  busy: boolean;
  showExamples: boolean;
  onSubmit: (dump: string) => Promise<void>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function CaptureBar({ busy, showExamples, onSubmit, inputRef }: CaptureBarProps) {
  const [text, setText] = useState('');
  const hintId = useId();
  const baseText = useRef('');
  const speech = useSpeechInput((spoken) => setText(baseText.current ? `${baseText.current}\n${spoken}` : spoken));

  const submit = async (value: string) => {
    if (!value.trim() || busy) return;
    // Stop listening first, or a late transcript would refill the box with the old dump.
    speech.stop();
    baseText.current = '';
    await onSubmit(value);
    setText('');
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(text);
    }
  };

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
      return;
    }
    baseText.current = text.trim();
    speech.start();
  };

  return (
    <section className="capture" aria-labelledby="capture-heading">
      <h2 id="capture-heading" className="capture__heading">
        What's sitting on your mind?
      </h2>
      <form className="capture__form" onSubmit={handleSubmit} aria-busy={busy}>
        <label htmlFor="capture-input" className="visually-hidden">
          Task or brain dump
        </label>
        <textarea
          id="capture-input"
          ref={inputRef}
          className="capture__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={2000}
          placeholder="e.g. do my taxes, call the dentist…"
          aria-describedby={hintId}
          readOnly={busy}
        />
        <p id={hintId} className="capture__hint">
          One task per line. <span className="kbd">Enter</span> breaks it down, <span className="kbd">Shift</span>+
          <span className="kbd">Enter</span> adds a line.
        </p>
        <div className="capture__actions">
          {speech.supported && (
            <button
              type="button"
              className={`btn ${speech.listening ? 'btn--listening' : ''}`}
              onClick={toggleMic}
              disabled={busy}
            >
              <Icon name="mic" />
              {speech.listening ? 'Listening… tap to stop' : 'Say it'}
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={busy || !text.trim()}>
            <Icon name="sparkle" />
            {busy ? 'Breaking it down…' : 'Break it down'}
          </button>
        </div>
        {speech.error && (
          <p className="capture__error" role="alert">
            {speech.error}
          </p>
        )}
      </form>
      {showExamples && (
        <div className="capture__examples">
          <p id="examples-label" className="capture__examples-label">
            Or try one:
          </p>
          <ul className="capture__chips" aria-labelledby="examples-label">
            {EXAMPLE_TASKS.map((example) => (
              <li key={example}>
                <button type="button" className="chip" onClick={() => void submit(example)} disabled={busy}>
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
