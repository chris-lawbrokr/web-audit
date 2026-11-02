import { StartForm } from '@/features/start/StartForm';
import { env } from '@/server/config/env';
import { CHECKS } from '@/shared/audit/checks';
import { CHECK_ICONS } from '@/shared/audit/icons';
import { AppHeader } from '@/shared/ui/AppHeader';
import { IconTile } from '@/shared/ui/IconTile';
import { Overline } from '@/shared/ui/Overline';

/** Step 1: the pitch, the URL field and what the audit looks at. */
export default function StartPage() {
  return (
    <>
      <AppHeader sample={env.AUDIT_PROVIDERS === 'fixtures'} />
      <main className="flex flex-1 flex-col items-center px-gutter pt-[clamp(48px,10vh,112px)] pb-16">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-4 text-center">
          <Overline tone="accent">Free marketing web audit</Overline>
          <h1 className="font-serif text-[length:clamp(36px,5.5vw,56px)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance text-primary-900">
            See how your firm’s website stacks up against the firms down the street.
          </h1>
          <p className="max-w-[560px] text-[17px] leading-[26px] text-pretty text-muted-foreground">
            We’ll check your reviews, speed, traffic and how often search engines and AI assistants
            recommend you. Takes about 30 seconds.
          </p>
        </div>

        <StartForm />

        <section
          aria-labelledby="what-we-check"
          className="mt-[72px] flex w-full max-w-[1040px] flex-col gap-4"
        >
          <h2 id="what-we-check" className="text-center">
            <Overline>What we check</Overline>
          </h2>
          {/* Cells sit 1px apart on the border color, which draws the rules between them. */}
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px overflow-hidden rounded-lg border border-border bg-border">
            {CHECKS.map((check) => (
              <li key={check.key} className="flex flex-col gap-2.5 bg-card p-5">
                <IconTile icon={CHECK_ICONS[check.key]} />
                <span className="text-sm font-semibold text-primary-900">{check.title}</span>
                <span className="text-[13px] leading-[19px] text-pretty text-muted-foreground">
                  {check.blurb}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
