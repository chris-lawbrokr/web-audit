import Link from 'next/link';

import { AppHeader } from '@/shared/ui/AppHeader';
import { Overline } from '@/shared/ui/Overline';

/** Unknown addresses, and audits or reports that no longer exist (the in-memory store resets on restart). */
export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col items-center gap-4 px-gutter pt-[clamp(48px,10vh,112px)] text-center">
        <Overline tone="accent">Not found</Overline>
        <h1 className="font-serif text-[length:clamp(28px,4vw,40px)] leading-[1.1] font-semibold text-balance text-primary-900">
          We couldn’t find that audit.
        </h1>
        <p className="max-w-[480px] text-[15px] leading-[22px] text-pretty text-muted-foreground">
          The link may be mistyped, or the audit may have expired. Running a new one takes about 30
          seconds.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors duration-[120ms] ease-out hover:bg-primary-hover"
        >
          Run an audit
        </Link>
      </main>
    </>
  );
}
