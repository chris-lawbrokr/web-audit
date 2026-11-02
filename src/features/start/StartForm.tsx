'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { URL_INVALID } from '@/shared/audit/contracts';
import { cleanDomain, isValidDomain } from '@/shared/audit/domain';
import { callApi } from '@/shared/lib/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Field';

/**
 * The URL field. It takes anything that reduces to a domain, so a pasted
 * `https://www.firm.com/contact` works as well as `firm.com`.
 */
export function StartForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!isValidDomain(cleanDomain(url))) {
      setError(URL_INVALID);
      return;
    }
    setPending(true);
    try {
      const { auditId } = await callApi<{ auditId: string }>('/audits', {
        method: 'POST',
        body: { url },
      });
      router.push(`/scan/${auditId}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : URL_INVALID);
      setPending(false);
    }
  };

  // The browser's own URL check would reject a bare `firm.com`, so validation is ours alone.
  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-10 flex w-full max-w-[600px] flex-col gap-2"
    >
      <label htmlFor="firm-url" className="text-sm font-medium text-primary-900">
        Firm URL
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-0 flex-[1_1_300px]">
          <Input
            id="firm-url"
            size="lg"
            prefix="https://"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="yourfirm.com"
            // The URL field is the whole point of the page.
            autoFocus
            value={url}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'firm-url-error' : undefined}
            onChange={(event) => {
              setUrl(event.target.value);
              setError('');
            }}
          />
        </div>
        <Button type="submit" size="lg" loading={pending}>
          Run my audit
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {error && (
        <span
          id="firm-url-error"
          role="alert"
          className="text-[13px] text-destructive-subtle-foreground"
        >
          {error}
        </span>
      )}
    </form>
  );
}
