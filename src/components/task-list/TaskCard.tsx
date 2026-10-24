import { useRef, useState } from 'react';
import { ENERGY_LABEL, type Task } from '../../lib/types';
import { formatMinutes } from '../../lib/format';
import { progress } from '../../state/tasks';
import { Icon } from '../ui/Icon';

interface TaskCardProps {
  task: Task;
  onToggleStep: (stepId: string, done: boolean) => void;
  onToggleToday: () => void;
  onRemove: () => void;
}

export function TaskCard({ task, onToggleStep, onToggleToday, onRemove }: TaskCardProps) {
  const [confirming, setConfirming] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);
  const cancelConfirm = () => {
    setConfirming(false);
    requestAnimationFrame(() => removeRef.current?.focus());
  };
  const { done, total } = progress(task);
  const headingId = `task-${task.id}`;
  const finished = task.doneAt !== undefined;

  return (
    <article className={`task ${finished ? 'task--done' : ''}`} aria-labelledby={headingId}>
      <header className="task__header">
        <h3 id={headingId} className="task__title">
          {task.title}
        </h3>
        <p className="task__progress">
          <span className="task__bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${total ? done / total : 0})` }} />
          </span>
          {done} of {total} steps done
          {task.source === 'ai' && <span className="task__badge">Planned with AI</span>}
        </p>
      </header>

      <ol className="task__steps">
        {task.steps.map((step) => (
          <li key={step.id} className={`task__step ${step.done ? 'is-done' : ''}`}>
            <label className="task__step-label">
              <input type="checkbox" checked={step.done} onChange={(e) => onToggleStep(step.id, e.target.checked)} />
              <span className="task__step-text">{step.text}</span>
            </label>
            <span className="task__step-meta">
              {formatMinutes(step.minutes)}
              <span className="energy-chip" data-energy={step.energy}>
                <span className="visually-hidden">Energy: </span>
                {ENERGY_LABEL[step.energy]}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <footer className="task__footer">
        <button type="button" className="btn btn--quiet" aria-pressed={task.today} onClick={onToggleToday}>
          <Icon name="star" />
          {task.today ? 'Today (pinned)' : 'Pin to today'}
        </button>
        {confirming ? (
          <span className="task__confirm" role="group" aria-label={`Confirm removing ${task.title}`}>
            <button type="button" className="btn btn--quiet task__danger" onClick={onRemove} autoFocus>
              Yes, remove it
            </button>
            <button type="button" className="btn btn--quiet" onClick={cancelConfirm}>
              Keep it
            </button>
          </span>
        ) : (
          <button ref={removeRef} type="button" className="btn btn--quiet" onClick={() => setConfirming(true)}>
            <Icon name="trash" />
            Remove<span className="visually-hidden"> {task.title}</span>
          </button>
        )}
      </footer>
    </article>
  );
}
