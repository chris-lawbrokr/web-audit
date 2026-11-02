import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Form primitives. Control height 36, radius-md, 1px --input border (the 3:1
 * non-text boundary), 2px --ring focus. The label is always a real `<label for>`;
 * placeholders are examples, never labels (design system §2 Forms).
 */

const control =
  'w-full px-3 rounded-md border border-input bg-card text-foreground ' +
  'transition-[color,border-color,box-shadow] duration-[120ms] ease-out ' +
  'placeholder:text-neutral-500 hover:not-disabled:border-neutral-500 ' +
  'focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_var(--primary-200)] ' +
  'aria-invalid:border-destructive disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed';

/* Design system: Input sizes sm 32 / default 36 / lg 40. */
const controlSizes = {
  default: 'h-9 text-sm',
  lg: 'h-10 text-base',
} as const;

type ControlSize = keyof typeof controlSizes;

/** The ids a control's hint and error are rendered under, for aria-describedby. */
const hintId = (id: string) => `${id}-hint`;
const errorId = (id: string) => `${id}-err`;

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  return error ? errorId(id) : hint ? hintId(id) : undefined;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {label}
        {required && <span className="font-normal text-muted-foreground"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <span id={hintId(id)} className="text-xs text-muted-foreground">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={errorId(id)}
          role="alert"
          className="text-xs font-medium text-destructive-subtle-foreground"
        >
          {error}
        </span>
      )}
    </div>
  );
}

interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size' | 'prefix'> {
  size?: ControlSize;
  /** Fixed text drawn inside the control ahead of the value, like "https://". */
  prefix?: string;
}

/** The bare control, for layouts where the label and message sit elsewhere. */
export function Input({ size = 'default', prefix, className, style, ...props }: InputProps) {
  const input = (
    <input
      className={cn(control, controlSizes[size], className)}
      // The design system's prefix rule: 12px inset, ~8px a character, 6px gap.
      style={prefix ? { ...style, paddingLeft: 12 + prefix.length * 8 + 6 } : style}
      {...props}
    />
  );
  if (!prefix) return input;

  return (
    <div className="relative flex w-full items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-sm text-muted-foreground"
      >
        {prefix}
      </span>
      {input}
    </div>
  );
}

interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'size'> {
  label: string;
  hint?: string;
  error?: string;
  size?: ControlSize;
}

export function TextField({
  label,
  hint,
  error,
  required,
  size = 'default',
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        className={cn(control, controlSizes[size], className)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<ComponentPropsWithRef<'select'>, 'id'> {
  label: string;
  placeholder: string;
  options: readonly string[];
  hint?: string;
  error?: string;
}

export function SelectField({
  label,
  placeholder,
  options,
  hint,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={id}
          className={cn(
            control,
            controlSizes.default,
            'cursor-pointer appearance-none pr-9',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </FieldShell>
  );
}

interface CheckboxFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type'> {
  label: string;
}

/** A 16px box in brand ink with its label beside it; the whole row toggles. */
export function CheckboxField({ label, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2', className)}>
      <span className="relative grid shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className={
            'peer m-0 size-4 cursor-pointer appearance-none rounded-sm border border-primary bg-card ' +
            'transition-colors duration-[120ms] ease-out checked:bg-primary ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          }
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="text-sm leading-4 font-medium text-foreground">{label}</span>
    </label>
  );
}
