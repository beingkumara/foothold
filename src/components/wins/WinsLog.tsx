import { AnimatePresence, motion } from 'motion/react';
import type { Win } from '../../lib/types';
import { winsToday } from '../../state/tasks';
import './wins.css';

interface WinsLogProps {
  wins: readonly Win[];
  now: number;
}

const MAX_SHOWN = 12;

const timeOf = (at: number): string => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Counters the "I did nothing today" feeling: every finished step is a win. */
export function WinsLog({ wins, now }: WinsLogProps) {
  const today = winsToday(wins, now);
  return (
    <section className="wins" aria-labelledby="wins-heading">
      <h2 id="wins-heading" className="wins__heading">
        <span className="wins__count-wrap">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={today}
              className="wins__count"
              initial={{ y: -40, scale: 1.6, rotate: -14, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: -4, opacity: 1 }}
              exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            >
              {today}
            </motion.span>
          </AnimatePresence>
        </span>
        <span>{today === 1 ? 'small win today' : 'small wins today'}</span>
      </h2>
      {wins.length === 0 ? (
        <p className="wins__empty">Every step you finish lands here. Even tiny ones.</p>
      ) : (
        <ol className="wins__list">
          {wins.slice(0, MAX_SHOWN).map((win) => (
            <motion.li
              key={win.id}
              layout="position"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={win.text.startsWith('Finished:') ? 'is-task' : undefined}
            >
              <time dateTime={new Date(win.at).toISOString()}>{timeOf(win.at)}</time>
              <span>{win.text}</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
