import { ENERGY_LABEL, type Energy } from '../../lib/types';
import { formatMinutes } from '../../lib/format';
import type { NextPick } from '../../state/tasks';
import { Icon } from '../ui/Icon';
import './next-step.css';

interface NextStepProps {
  pick: NextPick | null;
  energy: Energy;
  stepNumber: number;
  stepTotal: number;
  hasOpenTasks: boolean;
  hasSkipped: boolean;
  shortcuts: boolean;
  canSpeak: boolean;
  onDone: () => void;
  onSkip: () => void;
  onStuck: () => void;
  onFocus: () => void;
  onSpeak: () => void;
  onRestoreSkipped: () => void;
}

const Shortcut = ({ show, k }: { show: boolean; k: string }) =>
  show ? (
    <span className="kbd" aria-hidden="true">
      {k}
    </span>
  ) : null;

export function NextStep(props: NextStepProps) {
  const { pick, energy, shortcuts } = props;

  if (!pick) {
    return (
      <section className="next next--empty" aria-labelledby="next-heading">
        <p className="next__eyebrow">Just one thing</p>
        <h2 id="next-heading" className="next__step" tabIndex={-1}>
          {props.hasSkipped
            ? 'You set everything aside for now. That is allowed.'
            : props.hasOpenTasks
              ? 'Nothing left to do.'
              : 'Nothing to do yet. Tell me one thing that is on your mind.'}
        </h2>
        {props.hasSkipped && (
          <div className="next__actions">
            <button type="button" className="btn" onClick={props.onRestoreSkipped}>
              <Icon name="undo" />
              Bring them back
            </button>
          </div>
        )}
      </section>
    );
  }

  const { task, step, stretch } = pick;

  return (
    <section className="next" aria-labelledby="next-heading" aria-describedby="next-meta">
      <div className="next__card">
        <div className="next__content" key={step.id}>
        <p className="next__eyebrow">
          Just one thing
          <span className="next__from">
            {' '}
            · from <strong>{task.title}</strong> · step {props.stepNumber} of {props.stepTotal}
          </span>
        </p>
        <h2 id="next-heading" className="next__step" tabIndex={-1}>
          {step.text}
        </h2>
        <p id="next-meta" className="next__meta">
          <span className="time-chip">
            <span aria-hidden="true">◷</span> about {formatMinutes(step.minutes)}
          </span>
          <span className="energy-chip" data-energy={step.energy}>
            <span className="visually-hidden">Energy needed: </span>
            {ENERGY_LABEL[step.energy]}
          </span>
        </p>
        {stretch && (
          <p className="next__stretch">
            Nothing fits “{ENERGY_LABEL[energy].toLowerCase()}” right now, so this is the gentlest step there is. Resting
            instead is a valid choice. Or press “I'm stuck” to make it smaller.
          </p>
        )}
        </div>
        <div className="next__actions">
          <button type="button" className="btn btn--primary btn--big" onClick={props.onFocus}>
            <Icon name="play" />
            Start
            <Shortcut show={shortcuts} k="F" />
          </button>
          <button type="button" className="btn btn--big" onClick={props.onDone}>
            <Icon name="check" />
            Done
            <Shortcut show={shortcuts} k="D" />
          </button>
        </div>
        <div className="next__secondary">
          <button type="button" className="btn btn--quiet" onClick={props.onStuck}>
            <Icon name="shrink" />
            I'm stuck — make it smaller
            <Shortcut show={shortcuts} k="S" />
          </button>
          <button type="button" className="btn btn--quiet" onClick={props.onSkip}>
            <Icon name="skip" />
            Not now
            <Shortcut show={shortcuts} k="N" />
          </button>
          {props.canSpeak && (
            <button type="button" className="btn btn--quiet" onClick={props.onSpeak}>
              <Icon name="speaker" />
              Read aloud
              <Shortcut show={shortcuts} k="R" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
