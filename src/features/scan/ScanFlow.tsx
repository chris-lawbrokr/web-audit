'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { AuditSnapshot, QuizAnswers, UnlockRequest } from '@/shared/audit/contracts';
import { CHECKS } from '@/shared/audit/checks';
import type { QuizKey } from '@/shared/audit/quiz';
import { callApi } from '@/shared/lib/api';
import { Overline } from '@/shared/ui/Overline';
import { Progress } from '@/shared/ui/Progress';

import { GateScreen } from '../gate/GateScreen';
import { FindingsFeed } from './FindingsFeed';
import { ScanChecklist } from './ScanChecklist';
import { WaitingQuiz } from './WaitingQuiz';

/** How often the scan screen asks the server for progress. */
const POLL_MS = 700;

/** The beat between the scan hitting 100% and the gate appearing. */
const SETTLE_MS = 700;

/**
 * The scan, then the gate. Progress comes from the server; quiz answers are saved as they're given
 * so they shape the report and survive a reload.
 */
export function ScanFlow({ auditId, initial }: { auditId: string; initial: AuditSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [answers, setAnswers] = useState<QuizAnswers>(initial.answers);
  const [gate, setGate] = useState(initial.status === 'complete');
  const complete = snapshot.status === 'complete';

  useEffect(() => {
    if (complete) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      callApi<AuditSnapshot>(`/audits/${auditId}`)
        .then((next) => {
          if (!cancelled) setSnapshot(next);
        })
        // A missed poll is retried by the next one: the snapshot is unchanged, so set a copy.
        .catch(() => {
          if (!cancelled) setSnapshot((current) => ({ ...current }));
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auditId, complete, snapshot]);

  useEffect(() => {
    if (!complete || gate) return;
    const timer = setTimeout(() => setGate(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [complete, gate]);

  // Every step starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [gate]);

  const saveAnswers = useCallback(
    (next: QuizAnswers) => {
      setAnswers(next);
      // Best effort: a lost answer only means a less tailored report.
      callApi(`/audits/${auditId}/answers`, { method: 'PUT', body: next }).catch(() => undefined);
    },
    [auditId],
  );

  const unlock = useCallback(
    async (lead: UnlockRequest) => {
      const { reportId } = await callApi<{ reportId: string }>(`/audits/${auditId}/unlock`, {
        method: 'POST',
        body: lead,
      });
      router.push(`/report/${reportId}`);
    },
    [auditId, router],
  );

  if (gate) {
    return <GateScreen findingsCount={snapshot.findingsCount ?? 0} onUnlock={unlock} />;
  }

  const active = snapshot.checks.findIndex((check) => check.status === 'running');
  const status = complete
    ? 'Scoring your results'
    : `Step ${Math.max(active, 0) + 1} of ${CHECKS.length} · ${CHECKS[Math.max(active, 0)]?.title ?? ''}`;

  // From 840px up the scan fits the viewport exactly: checklist on the left, quiz and findings on the
  // right, the findings scrolling inside their card. Below that it's one column and the page scrolls.
  return (
    <main className="flex flex-col items-center px-gutter py-[clamp(16px,4vh,40px)] min-[840px]:h-[calc(100dvh-3.5rem)] min-[840px]:min-h-[520px]">
      <div className="flex min-h-0 w-full max-w-[960px] flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Overline tone="accent">Auditing</Overline>
          <h1 className="font-serif text-[length:clamp(26px,3.4vw,34px)] leading-[1.1] font-semibold tracking-[-0.01em] break-words text-primary-900">
            {snapshot.domain}
          </h1>
          <p className="text-sm text-muted-foreground">
            Usually under a minute. Keep this tab open and we’ll show your score when it’s ready.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[13px] text-muted-foreground">
            <span>{status}</span>
            <span className="font-semibold text-primary-900 tabular-nums">
              {snapshot.progress}%
            </span>
          </div>
          <Progress value={snapshot.progress} max={100} label="Audit progress" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 min-[840px]:auto-rows-[minmax(0,1fr)] min-[840px]:grid-cols-2">
          <ScanChecklist checks={snapshot.checks} />
          <div className="flex min-h-0 flex-col gap-4">
            <WaitingQuiz
              answers={answers}
              // The options come from QUIZ, so a picked value is always one of its key's answers.
              onAnswer={(key: QuizKey, value: string) =>
                saveAnswers({ ...answers, [key]: value } as QuizAnswers)
              }
              onReset={() => saveAnswers({})}
            />
            <FindingsFeed pagesRead={snapshot.pagesRead} discoveries={snapshot.discoveries} />
          </div>
        </div>
      </div>
    </main>
  );
}
