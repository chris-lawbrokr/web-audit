import { useEffect, useState } from 'react';

/**
 * True when the visitor has asked for reduced motion. CSS already flattens the animations; this is for
 * the JavaScript side, timers that would otherwise still run their full course.
 */
export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts from zero up to `target` over `duration`, easing out (cubic) so it slows into the final
 * number. With reduced motion it jumps straight to the target.
 */
export function useCountUp(target: number, duration: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = prefersReducedMotion() ? 1 : Math.min(1, (now - startedAt) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
