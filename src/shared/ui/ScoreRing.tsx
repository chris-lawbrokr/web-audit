import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/* Drawn in a 160 box: radius 68 leaves room for the 12px stroke. */
const RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreRingProps {
  /** 0–100. */
  value: number;
  /** Sets the ring's size, like `size-[140px]`. */
  className?: string;
  /** What sits in the middle — the score and its "out of 100". */
  children: ReactNode;
}

/** The health score as a ring that fills clockwise from the top. */
export function ScoreRing({ value, className, children }: ScoreRingProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <svg viewBox="0 0 160 160" aria-hidden="true" className="block size-full">
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          strokeWidth="12"
          className="fill-none stroke-neutral-200"
        />
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          strokeWidth="12"
          transform="rotate(-90 80 80)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          className="fill-none stroke-primary-900"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
