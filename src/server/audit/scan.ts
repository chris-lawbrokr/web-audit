import 'server-only';

import { CHECKS } from '@/shared/audit/checks';
import type { AuditSnapshot } from '@/shared/audit/contracts';

import { scoreAudit } from './scoring';
import type { AuditRecord } from './store';

/*
 * What the scan screen sees while the pipeline runs: each check's real state and the discoveries made
 * so far. Never a score: see the lock rule on AuditSnapshot.
 */

/** Done checks count fully; a running one counts by how far through its steps it is. */
function progressOf(audit: AuditRecord): number {
  if (audit.completedAt !== null) return 100;
  const shares = CHECKS.map(({ key, steps }) => {
    const state = audit.checks[key];
    if (state.status === 'done') return 1;
    if (state.status === 'queued') return 0;
    return ((state.step + 0.5) / steps.length) * 0.9;
  });
  const average = shares.reduce((sum, share) => sum + share, 0) / CHECKS.length;
  return Math.min(99, Math.floor(average * 100));
}

export function snapshotOf(audit: AuditRecord): AuditSnapshot {
  const complete = audit.completedAt !== null;
  return {
    domain: audit.domain,
    status: complete ? 'complete' : 'running',
    progress: progressOf(audit),
    checks: CHECKS.map(({ key, steps }) => {
      const { status, step } = audit.checks[key];
      return { key, status, subStep: status === 'running' ? (steps[step] ?? '') : '' };
    }),
    discoveries: audit.discoveries,
    headline: complete ? scoreAudit(audit).headline : null,
    reportId: audit.reportId,
  };
}
