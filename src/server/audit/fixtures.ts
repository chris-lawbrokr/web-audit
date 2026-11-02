import 'server-only';

import type { AuditMetrics, Competitor } from './types';

/*
 * SAMPLE DATA. Nothing is measured yet: each domain gets made-up numbers, picked from the domain name
 * so the same site always scores the same and different sites score differently. This is the seam the
 * real providers replace (DataForSEO, Semrush, PageSpeed Insights, CrUX), one adapter each.
 */

/** The mock's demo firm, which gets exactly the mock's "mid" numbers so the two can be compared. */
const MOCK_DOMAIN = 'smithinjurylaw.com';

const LOW: AuditMetrics = {
  rating: 4.1,
  reviews: 23,
  mobile: 7.4,
  desktop: 3.6,
  bounce: 71,
  visits: 860,
  seo: 38,
  geo: 9,
};
const MID: AuditMetrics = {
  rating: 4.4,
  reviews: 61,
  mobile: 5.2,
  desktop: 2.4,
  bounce: 58,
  visits: 2140,
  seo: 62,
  geo: 24,
};
const HIGH: AuditMetrics = {
  rating: 4.9,
  reviews: 318,
  mobile: 2.1,
  desktop: 1.1,
  bounce: 39,
  visits: 7900,
  seo: 88,
  geo: 71,
};

const COMPETITOR_POOL: readonly Competitor[] = [
  { name: 'Hartley & Moss', rating: 4.7, reviews: 212 },
  { name: 'Reyes Injury Law', rating: 4.6, reviews: 158 },
  { name: 'Kline Legal Group', rating: 4.8, reviews: 96 },
  { name: 'Whitaker & Lane', rating: 4.5, reviews: 134 },
  { name: 'Bishop Law Partners', rating: 4.9, reviews: 77 },
  { name: 'Calloway Legal', rating: 4.3, reviews: 189 },
  { name: 'Mendez & Ortiz', rating: 4.7, reviews: 241 },
  { name: 'Prescott Law Group', rating: 4.6, reviews: 63 },
];

/** FNV-1a, then mulberry32: a small seeded generator, so a domain always draws the same numbers. */
function randomFor(seed: string): () => number {
  let hash = 2166136261;
  for (const char of seed) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const round = (value: number, step: number) => Math.round(value / step) * step;

/** One overall strength (0 weak, 1 strong) per firm, each metric jittered a little around it. */
export function sampleAuditFor(domain: string): {
  metrics: AuditMetrics;
  competitors: Competitor[];
} {
  const random = randomFor(domain);
  const strength = random();

  const metric = (key: keyof AuditMetrics, step: number) => {
    const t = Math.max(0, Math.min(1, strength + (random() - 0.5) * 0.3));
    const value = t < 0.5 ? lerp(LOW[key], MID[key], t * 2) : lerp(MID[key], HIGH[key], t * 2 - 1);
    return Number(round(value, step).toFixed(1));
  };

  const metrics: AuditMetrics =
    domain === MOCK_DOMAIN
      ? MID
      : {
          rating: metric('rating', 0.1),
          reviews: metric('reviews', 1),
          mobile: metric('mobile', 0.1),
          desktop: metric('desktop', 0.1),
          bounce: metric('bounce', 1),
          visits: metric('visits', 10),
          seo: metric('seo', 1),
          geo: metric('geo', 1),
        };

  const pool = [...COMPETITOR_POOL];
  const competitors: Competitor[] = [];
  while (competitors.length < 3) {
    const [picked] = pool.splice(Math.floor(random() * pool.length), 1);
    if (picked) competitors.push(picked);
  }
  return {
    metrics,
    competitors: domain === MOCK_DOMAIN ? COMPETITOR_POOL.slice(0, 3) : competitors,
  };
}
