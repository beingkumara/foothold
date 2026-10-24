import { useEffect, useRef } from 'react';
import { formatClock, formatMinutes, spokenDuration } from '../../lib/format';
import { playChime } from '../../lib/chime';
import type { Step } from '../../lib/types';
import { useAnnounce } from '../../hooks/useAnnouncer';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import './focus.css';

interface FocusModeProps {
  open: boolean;
  taskTitle: string;
  step: Step | null;
  sound: boolean;
  onDone: () => void;
  onStuck: () => void;
  onClose: () => void;
}

export function FocusMode({ open, taskTitle, step, sound, onDone, onStuck, onClose }: FocusModeProps) {
  return (
    <Dialog open={open && step !== null} title={`Focusing on: ${step?.text ?? ''}`} onClose={onClose} variant="immersive" hideTitle>
      {step && <FocusBody key={step.id} taskTitle={taskTitle} step={step} sound={sound} onDone={onDone} onStuck={onStuck} onClose={onClose} />}
    </Dialog>
  );
}

interface FocusBodyProps extends Omit<FocusModeProps, 'open' | 'step'> {
  step: Step;
}

function FocusBody({ taskTitle, step, sound, onDone, onStuck, onClose }: FocusBodyProps) {
  const targetMs = step.minutes * 60_000;
  const timer = useFocusTimer(targetMs);
  const announce = useAnnounce();
  const notified = useRef(false);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => primary.current?.focus(), []);

  useEffect(() => {
    if (!timer.reachedTarget || notified.current) return;
    notified.current = true;
    announce(`That's the ${formatMinutes(step.minutes)} you planned. Keep going or stop — both count.`);
    if (sound) playChime();
  }, [timer.reachedTarget, announce, sound, step.minutes]);

  const ratio = Math.min(1, timer.elapsedMs / targetMs);

  return (
    <div className="focus">
      <p className="focus__context">
        Working on <strong>{taskTitle}</strong>
      </p>
      <p className="focus__step">{step.text}</p>

      <div className="focus__timer">
        <div className="focus__track" aria-hidden="true">
          <span style={{ transform: `scaleX(${ratio})` }} />
        </div>
        <p className="focus__clock">
          <span aria-hidden="true">{formatClock(timer.elapsedMs)}</span>
          <span className="visually-hidden">{spokenDuration(timer.elapsedMs)} elapsed</span>
          <span className="focus__target"> of about {formatMinutes(step.minutes)}</span>
        </p>
        <p className="focus__note">
          {timer.reachedTarget
            ? 'That was the time you planned. Keep going or stop — both count.'
            : timer.running
              ? 'No rush. The bar fills slowly; nothing happens when it is full.'
              : 'Paused. Come back whenever you are ready.'}
        </p>
      </div>

      <div className="focus__actions">
        <button ref={primary} type="button" className="btn btn--primary btn--big" onClick={onDone}>
          <Icon name="check" />
          I did it
        </button>
        <button type="button" className="btn btn--big" onClick={timer.toggle} aria-pressed={!timer.running}>
          <Icon name={timer.running ? 'pause' : 'play'} />
          {timer.running ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onStuck}>
          <Icon name="shrink" />
          I'm stuck
        </button>
        <button type="button" className="btn btn--quiet" onClick={onClose}>
          Leave focus
        </button>
      </div>
    </div>
  );
}
