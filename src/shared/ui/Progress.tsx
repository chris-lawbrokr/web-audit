import { cn } from '@/shared/lib/cn';

interface ProgressProps {
  value: number;
  max: number;
  label: string;
  /** sm is the 4px track, default the 8px one. */
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Determinate progress. Primary bar on a muted track, radius-full (the one
 * shape besides avatar and switch that is allowed to be fully round), 300ms
 * width per the motion scale. A full bar turns success, as in the design system.
 */
export function Progress({ value, max, label, size = 'default', className }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'w-full overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1' : 'h-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-[300ms] ease-out',
          pct >= 100 ? 'bg-success' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
