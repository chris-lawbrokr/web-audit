import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
type Size = 'sm' | 'default' | 'lg' | 'icon';

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  /** Keeps the button's width, swaps the label for a spinner, sets aria-busy. */
  loading?: boolean;
}

/*
 * Base carries the border WIDTH only. Every variant then sets its own border
 * colour: two utilities both writing border-color would be resolved by
 * Tailwind's stylesheet order, not by the order they appear in these strings.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium ' +
  'whitespace-nowrap no-underline transition-colors duration-[120ms] ease-out cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
  'disabled:pointer-events-none disabled:opacity-50';

/* Interaction on the dark primary goes lighter, never darker (design system §1.1). */
const variants: Record<Variant, string> = {
  default:
    'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'border-transparent bg-secondary text-secondary-foreground hover:bg-primary-200 active:bg-primary-300',
  outline:
    'border-border bg-card text-foreground hover:border-primary-300 hover:bg-accent ' +
    'hover:text-accent-foreground active:bg-primary-200',
  ghost:
    'border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-primary-200',
  link: 'h-auto border-transparent bg-transparent p-0 text-primary underline-offset-[3px] hover:text-primary-hover hover:underline',
  destructive:
    'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive-subtle',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  default: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
  // 44px touch target below lg, 36px from lg up — the design system asks for
  // both (§1.9: targets >= 32px desktop / 44px at 414).
  icon: 'size-11 p-0 lg:size-9',
};

const classesFor = ({ variant = 'default', size = 'default' }: StyleProps, className?: string) =>
  cn(base, variants[variant], variant !== 'link' && sizes[size], className);

export function Button({
  variant,
  size,
  loading = false,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classesFor({ variant, size }, className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}

/** A link that looks like a button — for actions that leave the page, like the scheduler. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & StyleProps) {
  return (
    <a className={classesFor({ variant, size }, className)} {...props}>
      {children}
    </a>
  );
}
