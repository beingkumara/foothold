import { motion } from 'motion/react';
import './burst.css';

const SHAPES = ['star', 'dot', 'squiggle', 'bar'] as const;
const PIECES = 16;
const TONES = ['low', 'medium', 'high', 'wins'] as const;

// Deterministic pseudo-random so the burst looks hand-placed, not uniform.
const jitter = (i: number, salt: number): number => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PATHS: Record<(typeof SHAPES)[number], string> = {
  star: 'M12 2l2.6 6.4L21 9l-5 4.3L17.5 20 12 16.4 6.5 20 8 13.3 3 9l6.4-.6z',
  dot: 'M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z',
  squiggle: 'M2 14c3-6 5-6 7 0s4 6 7 0 4-6 6 0',
  bar: 'M4 9h16v6H4z',
};

/** A one-shot celebration. Decorative only; mount with a new key to replay. */
export function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + jitter(i, 1) * 0.6;
        const distance = 140 + jitter(i, 2) * 160;
        const shape = SHAPES[i % SHAPES.length];
        return (
          <motion.svg
            key={i}
            className={`burst__piece burst__piece--${TONES[i % TONES.length]}`}
            viewBox="0 0 24 24"
            width={18 + jitter(i, 3) * 18}
            height={18 + jitter(i, 3) * 18}
            initial={{ x: 0, y: 0, scale: 0.2, rotate: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 40,
              scale: [0.2, 1.2, 0.9],
              rotate: (jitter(i, 4) - 0.5) * 540,
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.9 + jitter(i, 5) * 0.4, ease: [0.12, 0.9, 0.3, 1] }}
          >
            <path d={PATHS[shape]} className={shape === 'squiggle' ? 'is-stroke' : undefined} />
          </motion.svg>
        );
      })}
    </div>
  );
}
