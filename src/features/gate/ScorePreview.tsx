import { CHECKS } from '@/shared/audit/checks';
import { CHECK_ICONS } from '@/shared/audit/icons';
import { useCountUp } from '@/shared/lib/motion';
import { Badge } from '@/shared/ui/Badge';
import { ScoreRing } from '@/shared/ui/ScoreRing';

/*
 * Placeholder numbers, not the visitor's: nothing scored reaches the browser before the gate
 * (04-backend §6, "The lock"). They only give the blur a report-like shape.
 */
const PLACEHOLDER_OVERALL = 64;
const PLACEHOLDER_TILES = ['4.4', '5.2s', '58%', '2,140', '3 of 12'];
const PLACEHOLDER_BARS = [62, 45, 54, 43, 47];

/** The report's shape, blurred behind the gate. Hidden from assistive tech: none of it is real. */
export function ScorePreview() {
  const shown = useCountUp(PLACEHOLDER_OVERALL, 1200);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex flex-col items-center gap-5 blur-[4px] select-none [grid-area:1/1]"
    >
      <ScoreRing value={shown} className="size-[190px]">
        <span className="font-serif text-[64px] leading-none font-semibold text-primary-900 tabular-nums blur-[5px]">
          {shown}
        </span>
        <span className="mt-1 text-[13px] text-muted-foreground">out of 100</span>
      </ScoreRing>
      <Badge variant="warning">Room to grow</Badge>
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        {CHECKS.map((check, index) => {
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
              <span className="font-serif text-[28px] leading-none font-semibold text-primary-900">
                {PLACEHOLDER_TILES[index]}
              </span>
              <div className="h-2 overflow-hidden rounded-[2px] bg-neutral-100">
                <div
                  className="h-full rounded-[2px] bg-chart-1"
                  style={{ width: `${PLACEHOLDER_BARS[index] ?? 50}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
