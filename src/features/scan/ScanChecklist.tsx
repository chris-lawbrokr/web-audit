import { Check } from 'lucide-react';

import { CHECKS } from '@/shared/audit/checks';
import type { AuditSnapshot } from '@/shared/audit/contracts';
import { CHECK_ICONS } from '@/shared/audit/icons';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/Card';
import { IconTile } from '@/shared/ui/IconTile';
import { Spinner } from '@/shared/ui/Spinner';

/**
 * The five checks as a list that ticks itself off. The active row is tinted and narrates its current
 * sub-step; finished rows get a check, queued ones stay gray.
 */
export function ScanChecklist({ checks }: { checks: AuditSnapshot['checks'] }) {
  return (
    <Card as="ol" className="flex flex-col overflow-hidden">
      {CHECKS.map((check, index) => {
        const state = checks.find((item) => item.key === check.key);
        const done = state?.status === 'done';
        const active = state?.status === 'running';
        const detail = done ? 'Done' : active ? `${state.subStep}…` : 'Queued';

        return (
          <li
            key={check.key}
            className={cn(
              'flex flex-1 items-center gap-3.5 px-4 py-3 transition-colors duration-[180ms] ease-out',
              index > 0 && 'border-t border-border',
              active ? 'bg-primary-50' : 'bg-card',
            )}
          >
            <IconTile icon={CHECK_ICONS[check.key]} tone={done || active ? 'primary' : 'muted'} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  'text-sm font-semibold',
                  done || active ? 'text-primary-900' : 'text-muted-foreground',
                )}
              >
                {check.title}
              </span>
              <span className="truncate text-[13px] text-muted-foreground">{detail}</span>
            </div>
            {active && <Spinner label="Scanning" />}
            {done && (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check aria-hidden="true" className="size-3.5" />
              </span>
            )}
          </li>
        );
      })}
    </Card>
  );
}
