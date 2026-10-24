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
        <span className="wins__count">{today}</span>
        <span>{today === 1 ? 'small win today' : 'small wins today'}</span>
      </h2>
      {wins.length === 0 ? (
        <p className="wins__empty">Every step you finish lands here. Even tiny ones.</p>
      ) : (
        <ol className="wins__list">
          {wins.slice(0, MAX_SHOWN).map((win) => (
            <li key={win.id} className={win.text.startsWith('Finished:') ? 'is-task' : undefined}>
              <time dateTime={new Date(win.at).toISOString()}>{timeOf(win.at)}</time>
              <span>{win.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
