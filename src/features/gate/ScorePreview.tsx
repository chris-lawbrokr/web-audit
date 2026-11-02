import { CHECKS } from '@/shared/audit/checks';
import { CHECK_ICONS } from '@/shared/audit/icons';
import { ScoreRing } from '@/shared/ui/ScoreRing';

/*
 * The report's shape behind the gate, with no numbers in it: nothing scored reaches the browser before
 * the unlock (04-backend §6, "The lock"), and invented stand-ins would be fake data. Gray blocks mark
 * where the score and each check's number will be.
 */

/** The report's outline, blurred behind the gate. Hidden from assistive tech: it holds no data. */
export function ScorePreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex flex-col items-center gap-5 blur-[4px] select-none [grid-area:1/1]"
    >
      <ScoreRing value={0} className="size-[190px]">
        <span className="h-14 w-20 rounded-md bg-neutral-200" />
        <span className="mt-2 text-[13px] text-muted-foreground">out of 100</span>
      </ScoreRing>
      <span className="h-5 w-28 rounded-md bg-neutral-200" />
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        {CHECKS.map((check) => {
          const Icon = CHECK_ICONS[check.key];
          return (
            <div
              key={check.key}
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-primary-900">
                <Icon className="size-4" />
                <span className="text-[13px] font-semibold">{check.title}</span>
              </div>
              <span className="h-7 w-16 rounded-md bg-neutral-200" />
              <div className="h-2 rounded-[2px] bg-neutral-100" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
