import { Lock } from 'lucide-react';

import type { UnlockRequest } from '@/shared/audit/contracts';
import { IconTile } from '@/shared/ui/IconTile';
import { Overline } from '@/shared/ui/Overline';

import { LeadForm } from './LeadForm';
import { ScorePreview } from './ScorePreview';

/**
 * Step 3: a blurred stand-in for the report, with the lead form floating over it. Both sit in the same
 * grid cell, so the card overlaps the preview without taking it out of the page's flow.
 */
export function GateScreen({
  headline,
  onUnlock,
}: {
  headline: string;
  onUnlock: (lead: UnlockRequest) => Promise<void>;
}) {
  return (
    <main className="flex flex-1 justify-center px-gutter pt-[clamp(16px,3vh,32px)] pb-4">
      <div className="grid w-full max-w-[980px]">
        <ScorePreview />

        <section
          aria-labelledby="gate-title"
          className="relative mt-[152px] flex w-[min(100%,480px)] animate-pop flex-col gap-4 self-start justify-self-center rounded-xl bg-card p-6 shadow-md [grid-area:1/1]"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <IconTile icon={Lock} size="sm" />
              <Overline tone="accent">Your score is ready</Overline>
            </div>
            <h1
              id="gate-title"
              className="font-serif text-[26px] leading-[1.15] font-semibold text-pretty text-primary-900"
            >
              Unlock your health score
            </h1>
            <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
              {headline} Tell us who you are to see the full breakdown.
            </p>
          </div>
          <LeadForm onSubmit={onUnlock} />
        </section>
      </div>
    </main>
  );
}
