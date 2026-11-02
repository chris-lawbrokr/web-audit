import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const tones = {
  primary: 'bg-primary-100 text-primary-900',
  muted: 'bg-neutral-100 text-neutral-500',
  accent: 'bg-violet-50 text-violet-600',
} as const;

const sizes = {
  sm: 'size-7',
  md: 'size-8',
} as const;

interface IconTileProps {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
}

/** A lucide icon on a tinted radius-md square. Decorative: the text beside it names it. */
export function IconTile({ icon: Icon, tone = 'primary', size = 'md' }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md transition-colors duration-[120ms] ease-out',
        tones[tone],
        sizes[size],
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
    </span>
  );
}
