import { AnimatePresence, motion, useIsPresent, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { ENERGY_LABEL, type Energy } from '../../lib/types';
import { formatMinutes } from '../../lib/format';
import type { NextPick } from '../../state/tasks';
import { Burst } from '../ui/Burst';
import { Icon } from '../ui/Icon';
import { KineticText } from '../ui/KineticText';
import { Scribble } from '../ui/Scribble';
import './next-step.css';

export type ExitIntent = 'done' | 'skip' | 'stuck' | 'swap';

interface NextStepProps {
  pick: NextPick | null;
  energy: Energy;
  stepNumber: number;
  stepTotal: number;
  /** Unfinished steps across all plans, for the stack of sheets behind the card. */
  remaining: number;
  hasOpenTasks: boolean;
  hasSkipped: boolean;
  shortcuts: boolean;
  canSpeak: boolean;
  exitIntent: ExitIntent;
  burstKey: number;
  reduceMotion: boolean;
  onDone: () => void;
  onSkip: () => void;
  onStuck: () => void;
  onFocus: () => void;
  onSpeak: () => void;
  onRestoreSkipped: () => void;
}

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 700;

const Shortcut = ({ show, k }: { show: boolean; k: string }) =>
  show ? (
    <span className="kbd" aria-hidden="true">
      {k}
    </span>
  ) : null;

const cardVariants = {
  enter: { y: 46, scale: 0.9, opacity: 0 },
  center: { y: 0, scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
  exit: (intent: ExitIntent) => {
    const fling = { duration: 0.42, ease: [0.4, 0, 0.9, 0.6] as const };
    switch (intent) {
      case 'done':
        return { x: 640, y: -40, opacity: 0, transition: fling };
      case 'skip':
        return { x: -640, y: 20, opacity: 0, transition: fling };
      case 'stuck':
        return { scale: 0.35, y: 80, opacity: 0, transition: { duration: 0.35 } };
      default:
        return { opacity: 0, scale: 0.96, transition: { duration: 0.2 } };
    }
  },
};

export function NextStep(props: NextStepProps) {
  const { pick, shortcuts, remaining } = props;

  return (
    <section className="next" aria-labelledby="next-heading">
      <div className="deck">
        {remaining > 2 && <div className="deck__sheet deck__sheet--2" aria-hidden="true" />}
        {remaining > 1 && <div className="deck__sheet deck__sheet--1" aria-hidden="true" />}
        <AnimatePresence mode="popLayout" custom={props.exitIntent} initial={false}>
          {pick ? (
            <DeckCard key={pick.step.id} {...props} pick={pick} />
          ) : (
            <EmptyCard key="empty" hasSkipped={props.hasSkipped} hasOpenTasks={props.hasOpenTasks} />
          )}
        </AnimatePresence>
        {props.burstKey > 0 && !props.reduceMotion && <Burst key={props.burstKey} />}
      </div>

      {pick ? (
        <>
          <div className="next__actions">
            <button type="button" className="btn btn--primary btn--big" onClick={props.onFocus}>
              <Icon name="play" />
              Start
              <Shortcut show={shortcuts} k="F" />
            </button>
            <button type="button" className="btn btn--done btn--big" onClick={props.onDone}>
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
          <p className="next__swipe-hint" aria-hidden="true">
            or fling the card: → done · ← not now
          </p>
        </>
      ) : (
        props.hasSkipped && (
          <div className="next__actions">
            <button type="button" className="btn" onClick={props.onRestoreSkipped}>
              <Icon name="undo" />
              Bring them back
            </button>
          </div>
        )
      )}
    </section>
  );
}

function DeckCard({ pick, energy, stepNumber, stepTotal, onDone, onSkip }: NextStepProps & { pick: NextPick }) {
  const isPresent = useIsPresent();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-16, 16]);
  const doneStamp = useTransform(x, [30, SWIPE_DISTANCE], [0, 1]);
  const skipStamp = useTransform(x, [-SWIPE_DISTANCE, -30], [1, 0]);
  const { task, step, stretch } = pick;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onDone();
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSkip();
  };

  return (
    <motion.div
      className="next__card"
      style={{ x, rotate }}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      drag={isPresent ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      aria-hidden={isPresent ? undefined : true}
    >
      <motion.span className="next__stamp next__stamp--done" style={{ opacity: doneStamp }} aria-hidden="true">
        Done!
      </motion.span>
      <motion.span className="next__stamp next__stamp--skip" style={{ opacity: skipStamp }} aria-hidden="true">
        Not now
      </motion.span>

      <div className="next__topline">
        <span className="sticker">Just one thing</span>
        <span className="next__count">
          <span className="visually-hidden">
            Step {stepNumber} of {stepTotal}
          </span>
          <span aria-hidden="true">
            {stepNumber}
            <small>/{stepTotal}</small>
          </span>
        </span>
      </div>
      <p className="next__from">
        from <strong>{task.title}</strong>
      </p>
      <h2 id={isPresent ? 'next-heading' : undefined} className="next__step" tabIndex={-1}>
        <KineticText text={step.text} />
      </h2>
      <p className="next__meta">
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
    </motion.div>
  );
}

function EmptyCard({ hasSkipped, hasOpenTasks }: { hasSkipped: boolean; hasOpenTasks: boolean }) {
  const isPresent = useIsPresent();
  const text = hasSkipped
    ? 'You set everything aside for now. That is allowed.'
    : hasOpenTasks
      ? 'Nothing left to do. Go touch grass.'
      : "What's one thing on your mind?";
  return (
    <motion.div
      className="next__card next__card--empty"
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      aria-hidden={isPresent ? undefined : true}
    >
      <span className="sticker">Just one thing</span>
      <h2 id={isPresent ? 'next-heading' : undefined} className="next__step" tabIndex={-1}>
        <KineticText text={text} />
      </h2>
      <Scribble className="next__scribble" />
      {!hasOpenTasks && <p className="next__from">Type it or say it in the box. I'll break it into tiny steps.</p>}
    </motion.div>
  );
}
