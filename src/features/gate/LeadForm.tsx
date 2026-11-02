import type { SubmitEvent } from 'react';
import { useRef, useState } from 'react';

import { PRACTICE_AREAS } from '@/shared/audit/checks';
import type { UnlockRequest } from '@/shared/audit/contracts';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  isValidEmail,
  isValidPhone,
  NAME_REQUIRED,
  PHONE_INVALID,
} from '@/shared/audit/contracts';
import { ApiRequestError } from '@/shared/lib/api';
import { Button } from '@/shared/ui/Button';
import { CheckboxField, SelectField, TextField } from '@/shared/ui/Field';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'form', string>>;

/** "Dana van der Berg" → first "Dana", last "van der Berg". */
function splitName(fullName: string): Pick<UnlockRequest, 'firstName' | 'lastName'> {
  const [firstName = '', ...rest] = fullName.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

/** The gate's fields. Name and email are required; phone is optional. The call box starts ticked. */
export function LeadForm({ onSubmit }: { onSubmit: (lead: UnlockRequest) => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [practiceArea, setPracticeArea] = useState<UnlockRequest['practiceArea']>('');
  const [wantsCall, setWantsCall] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const clearError = (key: keyof Errors) =>
    setErrors((current) => ({ ...current, [key]: undefined }));

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const trimmed = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    const next: Errors = {
      name: trimmed.name ? undefined : NAME_REQUIRED,
      email: isValidEmail(trimmed.email)
        ? undefined
        : trimmed.email
          ? EMAIL_INVALID
          : EMAIL_REQUIRED,
      phone: trimmed.phone && !isValidPhone(trimmed.phone) ? PHONE_INVALID : undefined,
    };
    setErrors(next);

    // Focus lands on the first field that needs fixing, in reading order.
    const invalid = next.name ? nameRef : next.email ? emailRef : next.phone ? phoneRef : null;
    if (invalid) {
      invalid.current?.focus();
      return;
    }

    setPending(true);
    try {
      await onSubmit({
        ...splitName(trimmed.name),
        email: trimmed.email,
        phone: trimmed.phone,
        practiceArea,
        wantsCall,
      });
    } catch (failure) {
      const fields = failure instanceof ApiRequestError ? failure.fields : {};
      setErrors({
        email: fields['email'],
        phone: fields['phone'],
        form:
          failure instanceof Error ? failure.message : 'Something went wrong. Please try again.',
      });
      setPending(false);
    }
  };

  // The browser's own check passes `a@b`, so validation is ours alone and shows inline.
  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <TextField
        ref={nameRef}
        label="Full name"
        required
        autoComplete="name"
        placeholder="Dana Smith"
        error={errors.name}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (errors.name && event.target.value.trim()) clearError('name');
        }}
      />
      <TextField
        ref={emailRef}
        label="Work email"
        type="email"
        required
        autoComplete="email"
        placeholder="dana@yourfirm.com"
        error={errors.email}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (errors.email && isValidEmail(event.target.value.trim())) clearError('email');
        }}
        onBlur={() => {
          const value = email.trim();
          if (value && !isValidEmail(value)) {
            setErrors((current) => ({ ...current, email: EMAIL_INVALID }));
          }
        }}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <TextField
          ref={phoneRef}
          label="Phone"
          type="tel"
          hint="Optional"
          autoComplete="tel"
          placeholder="(555) 010-2048"
          error={errors.phone}
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (errors.phone && isValidPhone(event.target.value)) clearError('phone');
          }}
        />
        <SelectField
          label="Practice area"
          placeholder="Choose one"
          options={PRACTICE_AREAS}
          value={practiceArea}
          onChange={(event) => setPracticeArea(event.target.value as UnlockRequest['practiceArea'])}
        />
      </div>
      <CheckboxField
        label="Walk me through it on a 15-minute call"
        checked={wantsCall}
        onChange={(event) => setWantsCall(event.target.checked)}
        className="py-1"
      />
      {errors.form && (
        <span role="alert" className="text-sm font-medium text-destructive-subtle-foreground">
          {errors.form}
        </span>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Unlock my score
      </Button>
      <span className="text-center text-xs leading-[18px] text-muted-foreground">
        Your report opens right away. No spam.
      </span>
    </form>
  );
}
