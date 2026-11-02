import 'server-only';

import type { CheckKey } from '@/shared/audit/checks';

/*
 * What an audit measured. Every number here came from a provider during this audit; when a check had
 * nothing to measure, it carries the reason instead, and the report says so rather than guessing.
 */

export type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string };

export const measured = <T>(value: T): Outcome<T> => ({ ok: true, value });
export const unmeasured = (reason: string): { ok: false; reason: string } => ({
  ok: false,
  reason,
});

export interface Business {
  name: string;
  domain: string | null;
  /** Google's listing id, which identifies the firm in the map pack. */
  cid: string | null;
  /** Out of 5; null when the listing has no reviews. */
  rating: number | null;
  reviews: number;
}

export interface Competitor extends Business {
  /** From the firm's office; null when either location is unknown. */
  miles: number | null;
}

export interface ReviewsResult {
  firm: Business;
  competitors: Competitor[];
}

export interface DeviceSpeed {
  /** Lighthouse lab test, seconds to the largest contentful paint. */
  labSeconds: number;
  /** Chrome's real visitors (75th percentile); null when Google lacks the data. */
  fieldSeconds: number | null;
}

export interface SpeedResult {
  phone: DeviceSpeed;
  /** Null if only the desktop test failed. */
  desktop: DeviceSpeed | null;
}

export interface TrafficResult {
  /** Semrush's estimate of monthly visits from Google search. */
  firmVisits: number;
  /** Competitors Semrush had data for. */
  competitors: { name: string; visits: number }[];
}

export interface SearchCheck {
  query: string;
  /** Position among the organic results (top 20), or null if not there. */
  firmRank: number | null;
  firmInLocalPack: boolean;
  /** Competitors in the top 10 or the local pack. */
  competitorsShown: string[];
}

export type AnswerSource = 'ChatGPT' | 'Perplexity' | 'Google AI Overview';

export interface AnswerCheck {
  source: AnswerSource;
  question: string;
  firmMentioned: boolean;
  competitorsMentioned: string[];
}

export interface VisibilityResult {
  place: string;
  /** Every competitor looked for, including ones that never turned up. */
  competitors: string[];
  searches: SearchCheck[];
  answers: AnswerCheck[];
}

export interface AuditResults {
  reviews: Outcome<ReviewsResult>;
  speed: Outcome<SpeedResult>;
  traffic: Outcome<TrafficResult>;
  visibility: Outcome<VisibilityResult>;
}

/** Results as they arrive: a check is missing until it settles. */
export type PartialResults = { [K in CheckKey]?: AuditResults[K] };

/** Google's "good" largest contentful paint, in seconds (web.dev/lcp). */
export const LCP_TARGET_SECONDS = 2.5;
