import 'server-only';

import type { CheckKey } from '@/shared/audit/checks';
import { CHECKS } from '@/shared/audit/checks';
import type { Band, CategoryReport, ComparisonRow } from '@/shared/audit/contracts';
import { headlineFor } from '@/shared/audit/headline';
import { formatNumber } from '@/shared/lib/format';

import type { AuditRecord } from './store';
import type { Outcome, ReviewsResult, SpeedResult, TrafficResult, VisibilityResult } from './types';
import { LCP_TARGET_SECONDS } from './types';

/*
 * Turns what the audit measured into scores, bands and copy. Pure: the same results always make the
 * same report. Every number shown is a measurement or plain arithmetic on measurements; the scoring
 * thresholds below are rules for Lawbrokr to tune (docs/scoring.md), never displayed as data.
 */

/** Review volume is scored against nearby firms; with none to compare, against this many reviews. */
const REVIEWS_REFERENCE = 100;
/** Search visits are scored against nearby firms; with none to compare, against this many a month. */
const VISITS_REFERENCE = 5000;
/** An overall score needs at least this many measured checks. */
const MIN_MEASURED = 3;

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const average = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

export function bandFor(score: number): Band {
  if (score >= 80) return { label: 'Healthy', variant: 'success' };
  if (score >= 50) return { label: 'Room to grow', variant: 'warning' };
  return { label: 'Needs attention', variant: 'destructive' };
}

const row = (label: string, value: string, pct: number, mine: boolean): ComparisonRow => ({
  label,
  value,
  pct: Math.max(2, Math.min(100, pct)),
  mine,
});

const seconds = (value: number) => `${value.toFixed(1)}s`;

type Details = Omit<CategoryReport, 'key' | 'title' | 'band'>;

function unavailable(outcome: Outcome<unknown> | undefined): Details {
  return {
    score: null,
    unavailable: outcome && !outcome.ok ? outcome.reason : 'This check didn’t finish.',
    metric: '—',
    metricLabel: '',
    rows: [],
    fix: '',
    short: '',
    source: '',
  };
}

function reviewsDetails(domain: string, { firm, competitors }: ReviewsResult): Details {
  const nearby = competitors.length > 0 ? average(competitors.map((c) => c.reviews)) : null;
  const reference = nearby !== null && nearby > 0 ? nearby : REVIEWS_REFERENCE;
  // Half for the rating (3.5 scores nothing, 5.0 full), half for volume, capped at 120% of the reference.
  const score = clampScore(
    (firm.rating === null ? 0 : ((firm.rating - 3.5) / 1.5) * 50) +
      (Math.min(firm.reviews / reference, 1.2) / 1.2) * 50,
  );
  const most = Math.max(firm.reviews, ...competitors.map((c) => c.reviews), 1);
  const value = (b: { rating: number | null; reviews: number }) =>
    b.rating === null ? 'No reviews' : `${b.rating.toFixed(1)} · ${formatNumber(b.reviews)}`;
  const needed = nearby === null ? 0 : Math.max(0, Math.round(nearby - firm.reviews));

  return {
    score,
    unavailable: null,
    metric: firm.rating === null ? '0' : firm.rating.toFixed(1),
    metricLabel:
      firm.rating === null
        ? 'Google reviews so far'
        : `average rating from ${formatNumber(firm.reviews)} Google reviews`,
    rows: [
      row(domain, value(firm), (firm.reviews / most) * 100, true),
      ...competitors.map((c) => row(c.name, value(c), (c.reviews / most) * 100, false)),
    ],
    fix:
      score >= 80
        ? `${nearby === null ? 'Strong reviews.' : 'You lead nearby firms on reviews.'} Keep asking every closed client, and reply to each review within a week.`
        : needed > 0
          ? `Ask every closed client for a review. You need about ${formatNumber(needed)} more to match the average of the firms nearby.`
          : 'Ask every closed client for a review, and reply to each one within a week.',
    short: 'Ask every closed client for a review.',
    source:
      competitors.length > 0
        ? `Google Maps, via DataForSEO: your listing and the ${competitors.length} nearest firms Google lists for your practice area.`
        : 'Google Maps, via DataForSEO. We found no firms nearby to compare against.',
  };
}

function speedDetails({ phone, desktop }: SpeedResult): Details {
  // Real visitors when Google has their data; the lab test reads far slower than most real visits.
  const headline = phone.fieldSeconds ?? phone.labSeconds;
  // Full marks at 1.5s on a phone, losing 15 a second after that.
  const score = clampScore(100 - (headline - 1.5) * 15);
  const shown: [string, number | null | undefined, boolean][] = [
    ['Phone, real visitors', phone.fieldSeconds, true],
    ['Desktop, real visitors', desktop?.fieldSeconds, true],
    ['Phone, lab test', phone.labSeconds, true],
    ['Desktop, lab test', desktop?.labSeconds, true],
    ['Google’s target', LCP_TARGET_SECONDS, false],
  ];
  const present = shown.filter((entry): entry is [string, number, boolean] => entry[1] != null);
  const scale = Math.max(8, ...present.map(([, value]) => value));

  return {
    score,
    unavailable: null,
    metric: seconds(headline),
    metricLabel:
      phone.fieldSeconds !== null
        ? 'for real visitors’ pages to load on a phone'
        : 'to load on a phone in Google’s lab test',
    rows: present.map(([label, value, mine]) =>
      row(label, seconds(value), (value / scale) * 100, mine),
    ),
    fix:
      score >= 80
        ? 'Fast on phones. Re-test whenever you add a new chat widget or tracking script.'
        : 'Compress hero images and load chat widgets after the page. Slow phone pages lose visitors before they call.',
    short: `Get your phone load time under ${LCP_TARGET_SECONDS} seconds.`,
    source:
      'Google PageSpeed Insights: Chrome’s data from real visits (75th percentile, last 28 days) where Google has it, and a Lighthouse lab test of a mid-range phone on a slow connection. Times are until the page’s largest element appears.',
  };
}

function trafficDetails(domain: string, { firmVisits, competitors }: TrafficResult): Details {
  const nearby = competitors.length > 0 ? average(competitors.map((c) => c.visits)) : null;
  const reference = nearby !== null && nearby > 0 ? nearby : VISITS_REFERENCE;
  const score = clampScore((Math.min(firmVisits / reference, 1.2) / 1.2) * 100);
  const most = Math.max(firmVisits, ...competitors.map((c) => c.visits), 1);

  return {
    score,
    unavailable: null,
    metric: formatNumber(firmVisits),
    metricLabel: 'estimated visits a month from Google search',
    rows: [
      row(domain, formatNumber(firmVisits), (firmVisits / most) * 100, true),
      ...competitors.map((c) =>
        row(c.name, formatNumber(c.visits), (c.visits / most) * 100, false),
      ),
    ],
    fix:
      score >= 80
        ? `${nearby === null ? 'Strong search traffic.' : 'You out-draw nearby firms in search.'} The priority now is turning those visits into consultations.`
        : nearby !== null && firmVisits > 0
          ? `The average firm nearby gets ${(nearby / firmVisits).toFixed(1)}× your search visits. Start with your Google Business Profile and a page for each practice area.`
          : 'Start with your Google Business Profile and a page for each practice area.',
    short: 'Grow local search traffic.',
    source:
      'Semrush’s estimate of monthly visits from Google’s organic results in the US. It doesn’t count ads, referrals or people who type your address.',
  };
}

function visibilityDetails(domain: string, result: VisibilityResult): Details {
  const { place, competitors, searches, answers } = result;
  const shown = searches.filter(
    (search) => (search.firmRank !== null && search.firmRank <= 10) || search.firmInLocalPack,
  ).length;
  const mentioned = answers.filter((answer) => answer.firmMentioned).length;
  const seo = searches.length > 0 ? shown / searches.length : null;
  const geo = answers.length > 0 ? mentioned / answers.length : null;
  const score = clampScore(
    100 * (seo !== null && geo !== null ? seo * 0.6 + geo * 0.4 : (seo ?? geo ?? 0)),
  );

  // Every firm's appearances across the same searches and answers: top 10, map pack or named.
  const total = searches.length + answers.length;
  const hitsFor = (name: string) =>
    searches.filter((search) => search.competitorsShown.includes(name)).length +
    answers.filter((answer) => answer.competitorsMentioned.includes(name)).length;
  const sources = [...new Set(answers.map((answer) => answer.source))];

  return {
    score,
    unavailable: null,
    metric:
      answers.length > 0 ? `${mentioned} of ${answers.length}` : `${shown} of ${searches.length}`,
    metricLabel:
      answers.length > 0
        ? 'AI answers that mention your firm'
        : 'local Google searches that show your firm',
    rows: [
      row(domain, `${shown + mentioned} of ${total}`, ((shown + mentioned) / total) * 100, true),
      ...competitors.map((name) => {
        const hits = hitsFor(name);
        return row(name, `${hits} of ${total}`, (hits / total) * 100, false);
      }),
    ],
    fix:
      score >= 80
        ? 'Search engines and AI assistants both know you. Keep your firm details identical everywhere they’re listed.'
        : 'Add practice-area FAQs and keep your name, address and phone identical across directories so AI assistants can cite you.',
    short: 'Get cited in AI answers.',
    source:
      `${searches.length} Google searches near ${place} (top 10 results and the map pack)` +
      (answers.length > 0 ? ` and ${answers.length} answers from ${sources.join(', ')}` : '') +
      ', via DataForSEO. Each bar counts the searches and answers a firm appears in. AI answers vary from run to run.',
  };
}

export interface ScoredAudit {
  /** Null when fewer than three checks were measured. */
  overall: number | null;
  band: Band | null;
  categories: CategoryReport[];
  /** Measured checks scoring under 80: the "things" in "We found N things". */
  findingsCount: number;
  headline: string;
}

export function scoreAudit(audit: Pick<AuditRecord, 'domain' | 'results'>): ScoredAudit {
  const { domain, results } = audit;
  const details: Record<CheckKey, Details> = {
    reviews: results.reviews?.ok
      ? reviewsDetails(domain, results.reviews.value)
      : unavailable(results.reviews),
    speed: results.speed?.ok ? speedDetails(results.speed.value) : unavailable(results.speed),
    traffic: results.traffic?.ok
      ? trafficDetails(domain, results.traffic.value)
      : unavailable(results.traffic),
    visibility: results.visibility?.ok
      ? visibilityDetails(domain, results.visibility.value)
      : unavailable(results.visibility),
  };

  const categories: CategoryReport[] = CHECKS.map((check) => {
    const detail = details[check.key];
    return {
      key: check.key,
      title: check.title,
      ...detail,
      band: detail.score === null ? null : bandFor(detail.score),
    };
  });
  const scores = categories.flatMap((category) =>
    category.score === null ? [] : [category.score],
  );
  const overall = scores.length >= MIN_MEASURED ? clampScore(average(scores)) : null;
  const findingsCount = scores.filter((score) => score < 80).length;

  return {
    overall,
    band: overall === null ? null : bandFor(overall),
    categories,
    findingsCount,
    headline:
      overall === null
        ? 'We couldn’t find enough public data about this site to score it.'
        : headlineFor(findingsCount),
  };
}

/**
 * "Fix these first": measured checks that aren't healthy, lowest score first. Empty when everything
 * measured is healthy.
 */
export function prioritiesFor(categories: readonly CategoryReport[]): CategoryReport[] {
  return categories
    .filter((category) => category.score !== null && category.score < 80)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 3);
}
