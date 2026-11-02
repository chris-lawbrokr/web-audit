import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'ol';
}

/** The design system's card surface: white, 1px border, radius-lg, shadow-sm. */
export function Card({ as: Tag = 'div', className, ...props }: CardProps) {
  return (
    <Tag
      className={cn('rounded-lg border border-border bg-card shadow-sm', className)}
      {...props}
    />
  );
}
