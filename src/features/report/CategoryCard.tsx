import type { CategoryReport } from '@/shared/audit/contracts';
import { CHECK_ICONS } from '@/shared/audit/icons';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { IconTile } from '@/shared/ui/IconTile';
import { Overline } from '@/shared/ui/Overline';

/**
 * One category of the report: its score and band, the headline number, a bar per comparison and what
 * to do about it. The firm's own bars take the stronger chart fill and a bold label; everyone else's
 * are lighter and muted. The bars are decoration: the label and value beside each carry the data.
 */
export function CategoryCard({ category }: { category: CategoryReport }) {
  const titleId = `category-${category.key}`;

  return (
    <Card
      as="section"
      aria-labelledby={titleId}
      className="flex flex-col gap-[18px] p-5 print:break-inside-avoid"
    >
      <div className="flex items-center gap-3">
        <IconTile icon={CHECK_ICONS[category.key]} />
        <h2 id={titleId} className="min-w-0 flex-1 text-base font-semibold text-primary-900">
          {category.title}
        </h2>
        <Badge variant={category.band.variant}>{category.band.label}</Badge>
        <span className="min-w-[52px] text-right text-sm font-semibold text-primary-900 tabular-nums">
          {category.score}/100
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-serif text-4xl leading-none font-semibold text-primary-900 tabular-nums">
          {category.metric}
        </span>
        <span className="text-sm text-muted-foreground">{category.metricLabel}</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {category.rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] items-center gap-3"
          >
            <span
              className={cn(
                'truncate text-[13px]',
                row.mine ? 'font-semibold text-primary-900' : 'font-normal text-muted-foreground',
              )}
            >
              {row.label}
            </span>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-[2px] bg-neutral-100">
              <div
                className={cn('h-full rounded-[2px]', row.mine ? 'bg-chart-1' : 'bg-chart-5')}
                style={{ width: `${row.pct}%` }}
              />
            </div>
            <span
              className={cn(
                'text-[13px] whitespace-nowrap text-primary-900 tabular-nums',
                row.mine ? 'font-semibold' : 'font-normal',
              )}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        <Overline>What to do</Overline>
        <p className="text-sm leading-[21px] text-pretty text-primary-900">{category.fix}</p>
      </div>
    </Card>
  );
}
