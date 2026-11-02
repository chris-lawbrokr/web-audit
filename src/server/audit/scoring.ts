import 'server-only';

import type { CheckKey } from '@/shared/audit/checks';
import { CHECKS } from '@/shared/audit/checks';
import type { Band, CategoryReport, ComparisonRow, QuizAnswers } from '@/shared/audit/contracts';
import { headlineFor } from '@/shared/audit/headline';
import { GOAL_CATEGORY, GUESSES } from '@/shared/audit/quiz';
import { formatNumber } from '@/shared/lib/format';

import type { AuditMetrics, Competitor } from './types';
import { BENCHMARKS } from './types';

/*
 * Turns raw measurements into the scores, bands and copy the report shows, as in the mock. Pure
 * functions only: the same metrics always produce the same report.
 */

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const average = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

export function bandFor(score: number): Band {
  if (score >= 80) return { label: 'Healthy', variant: 'success' };
  if (score >= 50) return { label: 'Room to grow', variant: 'warning' };
  return { label: 'Needs attention', variant: 'destructive' };
}

/** Each category out of 100. */
function scoreCategories(
  metrics: AuditMetrics,
  competitors: readonly Competitor[],
): Record<CheckKey, number> {
  const nearbyReviews = average(competitors.map((competitor) => competitor.reviews));
  return {
    // Half for the rating (3.5 scores nothing, 5.0 scores full), half for review volume against
    // nearby firms, capped at 120% of their average.
    reviews: clampScore(
      ((metrics.rating - 3.5) / 1.5) * 50 +
        (Math.min(metrics.reviews / nearbyReviews, 1.2) / 1.2) * 50,
    ),
    // Full marks at 1.5s on a phone, losing 15 a second after that.
    speed: clampScore(100 - (metrics.mobile - 1.5) * 15),
    // Full marks at 30% bounce, losing 2 a point after that.
    bounce: clampScore(100 - (metrics.bounce - 30) * 2),
    // Relative to 5,000 visits a month, and never quite perfect.
    traffic: clampScore(Math.min(95, (metrics.visits / 5000) * 100)),
    visibility: clampScore(metrics.seo * 0.6 + metrics.geo * 0.4),
  };
}

const row = (label: string, value: string, pct: number, mine: boolean): ComparisonRow => ({
  label,
  value,
  pct: Math.max(2, Math.min(100, pct)),
  mine,
});

type Details = Pick<CategoryReport, 'metric' | 'metricLabel' | 'rows' | 'fix' | 'short'>;

/** What each category shows: its headline number, the comparison bars and the fix. */
function categoryDetails(
  domain: string,
  metrics: AuditMetrics,
  competitors: readonly Competitor[],
  scores: Record<CheckKey, number>,
): Record<CheckKey, Details> {
  const {
    speedTarget,
    speedScale,
    legalBounce,
    topBounce,
    nearbyVisits,
    topVisits,
    nearbyVisibility,
    aiQueries,
  } = BENCHMARKS;
  const maxReviews = Math.max(
    metrics.reviews,
    ...competitors.map((competitor) => competitor.reviews),
  );
  const reviewsNeeded = Math.max(
    0,
    Math.round(average(competitors.map((competitor) => competitor.reviews)) - metrics.reviews),
  );
  const aiMentions = Math.round((metrics.geo / 100) * aiQueries);

  return {
    reviews: {
      metric: metrics.rating.toFixed(1),
      metricLabel: `average rating from ${formatNumber(metrics.reviews)} Google reviews`,
      rows: [
        row(
          domain,
          `${metrics.rating.toFixed(1)} · ${formatNumber(metrics.reviews)}`,
          (metrics.reviews / maxReviews) * 100,
          true,
        ),
        ...competitors.map((competitor) =>
          row(
            competitor.name,
            `${competitor.rating.toFixed(1)} · ${formatNumber(competitor.reviews)}`,
            (competitor.reviews / maxReviews) * 100,
            false,
          ),
        ),
      ],
      fix:
        scores.reviews >= 80
          ? 'You lead nearby firms on reviews. Keep asking every closed client, and reply to each review within a week.'
          : `Ask every closed client for a review. You need about ${formatNumber(reviewsNeeded)} more to match the local average.`,
      short: 'Ask every closed client for a review.',
    },
    speed: {
      metric: `${metrics.mobile.toFixed(1)}s`,
      metricLabel: 'to load on a phone',
      rows: [
        row('Mobile', `${metrics.mobile.toFixed(1)}s`, (metrics.mobile / speedScale) * 100, true),
        row(
          'Desktop',
          `${metrics.desktop.toFixed(1)}s`,
          (metrics.desktop / speedScale) * 100,
          true,
        ),
        row('Google’s target', `${speedTarget}s`, (speedTarget / speedScale) * 100, false),
      ],
      fix:
        scores.speed >= 80
          ? 'Fast on both devices. Re-test whenever you add a new chat widget or tracking script.'
          : 'Compress hero images and load chat widgets after the page. Most visitors give up on a phone page that takes over 3 seconds.',
      short: 'Cut mobile load time under 3 seconds.',
    },
    bounce: {
      metric: `${metrics.bounce}%`,
      metricLabel: 'of visitors leave after one page',
      rows: [
        row(domain, `${metrics.bounce}%`, metrics.bounce, true),
        row('Legal average', `${legalBounce}%`, legalBounce, false),
        row('Top firms nearby', `${topBounce}%`, topBounce, false),
      ],
      fix:
        scores.bounce >= 80
          ? 'Visitors stick around. Make sure every page ends in one clear next step.'
          : 'Visitors leave without acting. Put one clear next step above the fold, like a short intake instead of a long contact form.',
      short: 'Give visitors one clear next step.',
    },
    traffic: {
      metric: formatNumber(metrics.visits),
      metricLabel: 'estimated visits a month',
      rows: [
        row(domain, formatNumber(metrics.visits), (metrics.visits / topVisits) * 100, true),
        row('Nearby average', formatNumber(nearbyVisits), (nearbyVisits / topVisits) * 100, false),
        row('Top nearby firm', formatNumber(topVisits), 100, false),
      ],
      fix:
        scores.traffic >= 80
          ? 'You out-draw nearby firms. The priority now is turning that traffic into consultations.'
          : `The average firm nearby gets ${(nearbyVisits / metrics.visits).toFixed(1)}× your visits. Most of the gap is local search, so start with your Google Business Profile and practice-area pages.`,
      short: 'Grow local search traffic.',
    },
    visibility: {
      metric: `${aiMentions} of ${aiQueries}`,
      metricLabel: 'AI answers that mention your firm',
      rows: [
        row('Search (SEO)', `${metrics.seo}/100`, metrics.seo, true),
        row('AI answers (GEO)', `${metrics.geo}/100`, metrics.geo, true),
        row('Nearby average', `${nearbyVisibility}/100`, nearbyVisibility, false),
      ],
      fix:
        scores.visibility >= 80
          ? 'Search engines and AI assistants both know you. Keep your firm details identical everywhere they’re listed.'
          : 'Add practice-area FAQs and keep your name, address and phone identical across directories so AI assistants can cite you.',
      short: 'Get cited in AI answers.',
    },
  };
}

export interface ScoredAudit {
  overall: number;
  band: Band;
  categories: CategoryReport[];
  /** Weighted so a category in trouble counts double one with room to grow. */
  findingsCount: number;
  headline: string;
}

export function scoreAudit(
  domain: string,
  metrics: AuditMetrics,
  competitors: readonly Competitor[],
): ScoredAudit {
  const scores = scoreCategories(metrics, competitors);
  const details = categoryDetails(domain, metrics, competitors, scores);
  const overall = clampScore(average(Object.values(scores)));
  const findingsCount = Object.values(scores).reduce(
    (count, score) => count + (score < 50 ? 2 : score < 80 ? 1 : 0),
    0,
  );

  return {
    overall,
    band: bandFor(overall),
    categories: CHECKS.map((check) => ({
      key: check.key,
      title: check.title,
      ...details[check.key],
      score: scores[check.key],
      band: bandFor(scores[check.key]),
    })),
    findingsCount,
    headline: headlineFor(findingsCount),
  };
}

/** "Fix these first": the visitor's goal leads, then the lowest scores. */
export function prioritiesFor(
  categories: readonly CategoryReport[],
  goal: QuizAnswers['goal'],
): CategoryReport[] {
  const focus = goal ? GOAL_CATEGORY[goal] : undefined;
  return [...categories]
    .sort((a, b) => Number(b.key === focus) - Number(a.key === focus) || a.score - b.score)
    .slice(0, 3);
}

/** How the score landed against the visitor's guess, or '' if they didn't guess. */
export function guessVerdict(guess: QuizAnswers['guess'], overall: number): string {
  const range = GUESSES.find((option) => option.label === guess);
  if (!range) return '';
  const verdict =
    overall >= range.lo && overall <= range.hi
      ? 'Spot on.'
      : range.lo > overall
        ? 'Most firms guess high.'
        : 'Better than you expected.';
  return `You guessed ${range.label} and scored ${overall}. ${verdict}`;
}
