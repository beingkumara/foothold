import { motion } from 'motion/react';
import { Fragment } from 'react';
import './kinetic.css';

interface KineticTextProps {
  text: string;
  /** Seconds between words. */
  stagger?: number;
  delay?: number;
}

/**
 * Words spring up through a mask, one after another. Screen readers get the
 * plain sentence once; the animated pieces are hidden from the accessibility tree.
 * Under reduced motion, MotionConfig skips the transforms and words simply appear.
 */
export function KineticText({ text, stagger = 0.045, delay = 0 }: KineticTextProps) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true" className="kinetic">
        {words.map((word, i) => (
          // The space sits outside the inline-block mask, where it would otherwise collapse.
          <Fragment key={`${i}-${word}`}>
            <span className="kinetic__mask">
              <motion.span
              className="kinetic__word"
              initial={{ y: '115%', rotate: 7 }}
              animate={{ y: '0%', rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28, delay: delay + i * stagger }}
            >
                {word}
              </motion.span>
            </span>{' '}
          </Fragment>
        ))}
      </span>
    </>
  );
}
