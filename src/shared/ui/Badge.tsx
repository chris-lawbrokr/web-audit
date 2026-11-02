import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'success' | 'warning' | 'destructive' | 'accent';

/* Status badges read the SUBTLE role pair: a light tint under same-family dark ink. */
const variants: Record<Variant, string> = {
  success: 'bg-success-subtle text-success-subtle-foreground',
  warning: 'bg-warning-subtle text-warning-subtle-foreground',
  destructive: 'bg-destructive-subtle text-destructive-subtle-foreground',
  accent: 'bg-violet-100 text-violet-900',
};

interface BadgeProps {
  variant: Variant;
  /** The design system's badges are uppercase unless they carry a proper name. */
  uppercase?: boolean;
  children: ReactNode;
}

export function Badge({ variant, uppercase = true, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md border border-transparent px-2 text-xs leading-none font-semibold whitespace-nowrap',
        uppercase && 'uppercase',
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}
