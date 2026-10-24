import { motion } from 'motion/react';

interface ScribbleProps {
  className?: string;
  delay?: number;
}

/** Hand-drawn underline that draws itself in. Decorative. */
export function Scribble({ className, delay = 0.3 }: ScribbleProps) {
  return (
    <svg className={className} viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <motion.path
        d="M4 16c40-9 80-12 120-8s70 7 110 0 50-6 62-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
