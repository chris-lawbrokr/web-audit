import 'server-only';

import { CHECKS } from '@/shared/audit/checks';
import type { AuditSnapshot, CheckStatus, Discovery } from '@/shared/audit/contracts';
import { formatNumber } from '@/shared/lib/format';

import { scoreAudit } from './scoring';
import type { AuditRecord } from './store';
import type { AuditMetrics, Competitor } from './types';
import { BENCHMARKS } from './types';

/*
 * The sample scan's timeline. Progress follows the clock from the audit's creation, so a reload picks
 * up where it was and nothing runs in the background. Each check owns an equal fifth of the bar. A
 * real pipeline (04-backend §5) reports its own step states instead.
 */

const SHARE = 100 / CHECKS.length;

/** "Hartley & Moss" → "HM": the capitalized words' first letters, two at most. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('');
}

/** What the scan's "What we're finding" feed reveals, and at what percent. */
function discoveriesFor(
  metrics: AuditMetrics,
  competitors: readonly Competitor[],
): (Discovery & { at: number })[] {
  return [
    {
      id: 'profile',
      at: 7,
      icon: 'map-pin',
      title: 'Found your Google Business Profile',
      detail: `${metrics.rating.toFixed(1)} rating from ${formatNumber(metrics.reviews)} reviews`,
    },
    {
      id: 'competitors',
      at: 15,
      icon: 'users',
      title: `Spotted ${competitors.length} competitors within 10 miles`,
      detail: competitors.map((competitor) => competitor.name).join(', '),
      avatars: competitors.map((competitor) => initials(competitor.name)),
    },
    {
      id: 'speed',
      at: 31,
      icon: 'smartphone',
      title: `Your homepage took ${metrics.mobile.toFixed(1)}s to load on a phone`,
      detail: `Google’s target is ${BENCHMARKS.speedTarget}s. Trying desktop next.`,
    },
    {
      id: 'engagement',
      at: 50,
      icon: 'pointer',
      title: `Followed visitors through ${BENCHMARKS.pagesRead} pages`,
      detail: 'Seeing where they leave, and comparing to other law firms.',
    },
    {
      id: 'visits',
      at: 70,
      icon: 'trending-up',
      title: `About ${formatNumber(metrics.visits)} people visit each month`,
      detail: 'Now working out where they come from.',
    },
    {
      id: 'ai',
      at: 87,
      icon: 'sparkles',
      title: 'Asked AI assistants who to hire near you',
      detail: 'Which ones named you is in your report.',
      chips: ['ChatGPT', 'Perplexity', 'AI Overviews'],
    },
  ];
}

export function progressOf(audit: AuditRecord, now: number): number {
  return Math.min(100, ((now - audit.createdAt) / audit.durationMs) * 100);
}

/** What the scan screen may see. Never a score: see the lock rule on AuditSnapshot. */
export function snapshotOf(audit: AuditRecord, now: number): AuditSnapshot {
  const progress = progressOf(audit, now);
  const complete = progress >= 100;

  const checks = CHECKS.map((check, index) => {
    const from = index * SHARE;
    const status: CheckStatus =
      progress >= from + SHARE ? 'done' : progress >= from ? 'running' : 'queued';
    const step = Math.min(
      check.steps.length - 1,
      Math.floor(((progress - from) / SHARE) * check.steps.length),
    );
    return {
      key: check.key,
      status,
      subStep: status === 'running' ? (check.steps[Math.max(0, step)] ?? '') : '',
    };
  });

  return {
    domain: audit.domain,
    status: complete ? 'complete' : 'running',
    progress: Math.floor(progress),
    checks,
    discoveries: discoveriesFor(audit.metrics, audit.competitors)
      .filter((discovery) => progress >= discovery.at)
      .map(({ at: _at, ...discovery }) => discovery),
    pagesRead: Math.round((progress / 100) * BENCHMARKS.pagesRead),
    answers: audit.answers,
    findingsCount: complete
      ? scoreAudit(audit.domain, audit.metrics, audit.competitors).findingsCount
      : null,
    reportId: audit.reportId,
  };
}
