import type { ReportPayload } from '@/shared/audit/contracts';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Overline } from '@/shared/ui/Overline';
import { ScoreRing } from '@/shared/ui/ScoreRing';

/** The overall score beside the fixes that matter most; no score when too little was measured. */
export function ScoreSummary({ report }: { report: ReportPayload }) {
  return (
    <Card
      as="section"
      aria-label="Overall score"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-8 p-7"
    >
      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing value={report.overall ?? 0} className="size-[140px]">
          <span className="font-serif text-[44px] leading-none font-semibold text-primary-900 tabular-nums">
            {report.overall ?? '—'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {report.overall === null ? 'not scored' : 'out of 100'}
          </span>
        </ScoreRing>
        <div className="flex flex-[1_1_180px] flex-col items-start gap-2.5">
          {report.band && <Badge variant={report.band.variant}>{report.band.label}</Badge>}
          <p className="font-serif text-xl leading-[26px] font-semibold text-pretty text-primary-900">
            {report.headline}
          </p>
        </div>
      </div>

      {report.fixFirst.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2>
            <Overline>Fix these first</Overline>
          </h2>
          <ol className="flex flex-col gap-3">
            {report.fixFirst.map((category, index) => (
              <li key={category.key} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-[13px] font-semibold text-primary-900 tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-primary-900">{category.title}</span>
                  <span className="text-[13px] leading-[19px] text-pretty text-muted-foreground">
                    {category.short}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
