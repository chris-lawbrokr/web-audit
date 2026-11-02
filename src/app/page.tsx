import { StartForm } from '@/features/start/StartForm';
import { AppHeader } from '@/shared/ui/AppHeader';
import { Overline } from '@/shared/ui/Overline';

/** Step 1: the pitch and the URL field. */
export default function StartPage() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-gutter pt-[clamp(32px,6vh,64px)] pb-[clamp(64px,18vh,180px)]">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-4 text-center">
          <Overline tone="accent">Free marketing web audit</Overline>
          <h1 className="font-serif text-[length:clamp(36px,5.5vw,56px)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance text-primary-900">
            See how your firm’s website stacks up against the firms down the street.
          </h1>
          <p className="max-w-[560px] text-[17px] leading-[26px] text-pretty text-muted-foreground">
            We’ll check your reviews, speed, traffic and how often search engines and AI assistants
            recommend you. Takes a minute or two.
          </p>
        </div>

        <StartForm />
      </main>
    </>
  );
}
