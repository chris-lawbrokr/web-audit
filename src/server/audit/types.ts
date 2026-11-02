import 'server-only';

/** The raw measurements behind a report. */
export interface AuditMetrics {
  /** Google rating, out of 5. */
  rating: number;
  /** Google review count. */
  reviews: number;
  /** Seconds to load on a phone. */
  mobile: number;
  /** Seconds to load on desktop. */
  desktop: number;
  /** Percent of visitors who leave after one page. */
  bounce: number;
  /** Estimated visits a month. */
  visits: number;
  /** Search visibility, out of 100. */
  seo: number;
  /** AI-answer visibility, out of 100. */
  geo: number;
}

export interface Competitor {
  name: string;
  rating: number;
  reviews: number;
}

/** The comparison points drawn against the firm's own numbers. */
export const BENCHMARKS = {
  /** Google's "good" largest contentful paint, in seconds. */
  speedTarget: 2.5,
  /** The longest load the speed bars are drawn against, in seconds. */
  speedScale: 8,
  legalBounce: 52,
  topBounce: 38,
  nearbyVisits: 4600,
  topVisits: 9200,
  nearbyVisibility: 58,
  /** How many AI answers are checked for a mention. */
  aiQueries: 12,
  /** How many pages the scan reads. */
  pagesRead: 42,
} as const;
