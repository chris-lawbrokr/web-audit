/**
 * The four things the audit measures, in the order the scan and the report show them. Bounce rate is
 * left out: no data source the audit has access to measures it (Semrush's Trends API would).
 */
export const CHECK_KEYS = ['reviews', 'speed', 'traffic', 'visibility'] as const;

export type CheckKey = (typeof CHECK_KEYS)[number];

export interface Check {
  key: CheckKey;
  title: string;
  /** What the scan says it is doing while this check runs, in order. */
  steps: readonly string[];
}

export const CHECKS: readonly Check[] = [
  {
    key: 'reviews',
    title: 'Google reviews',
    steps: [
      'Reading your homepage',
      'Finding your Google Business Profile',
      'Locating competitors within 10 miles',
    ],
  },
  {
    key: 'speed',
    title: 'Load speed',
    steps: ['Loading your homepage on a phone and on desktop'],
  },
  {
    key: 'traffic',
    title: 'Search traffic',
    steps: ['Estimating your visits from Google', 'Estimating competitors’ visits'],
  },
  {
    key: 'visibility',
    title: 'SEO & GEO visibility',
    steps: ['Running local Google searches', 'Asking ChatGPT and Perplexity who to hire'],
  },
];

/** The gate's practice-area options. */
export const PRACTICE_AREAS = [
  'Personal injury',
  'Family law',
  'Estates & probate',
  'Criminal defense',
  'Immigration',
  'Employment law',
  'Business & corporate',
  'Real estate',
  'Workers’ compensation',
  'Other',
] as const;

export type PracticeArea = (typeof PRACTICE_AREAS)[number];
