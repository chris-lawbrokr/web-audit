/** The five things the audit scores, in the order the scan and the report show them. */
export const CHECK_KEYS = ['reviews', 'speed', 'bounce', 'traffic', 'visibility'] as const;

export type CheckKey = (typeof CHECK_KEYS)[number];

export interface Check {
  key: CheckKey;
  title: string;
  blurb: string;
  /** What the scan says it is doing, in order, while this check is active. */
  steps: readonly string[];
}

export const CHECKS: readonly Check[] = [
  {
    key: 'reviews',
    title: 'Google reviews',
    blurb: 'Your rating and review count against the three closest competitors.',
    steps: [
      'Finding your Google Business Profile',
      'Locating competitors within 10 miles',
      'Comparing ratings and review counts',
    ],
  },
  {
    key: 'speed',
    title: 'Load speed',
    blurb: 'How long your site takes to appear on a phone and on desktop.',
    steps: [
      'Loading your homepage on a mid-range phone',
      'Measuring largest contentful paint',
      'Repeating the test on desktop',
    ],
  },
  {
    key: 'bounce',
    title: 'Bounce rate',
    blurb: 'How many visitors leave after a single page.',
    steps: [
      'Estimating engagement from traffic panels',
      'Comparing against legal-industry benchmarks',
    ],
  },
  {
    key: 'traffic',
    title: 'Traffic volume',
    blurb: 'Estimated monthly visits, and where they come from.',
    steps: ['Estimating monthly visits', 'Splitting sources: search, direct, referral'],
  },
  {
    key: 'visibility',
    title: 'SEO & GEO visibility',
    blurb: 'How often Google and AI assistants recommend your firm.',
    steps: [
      'Checking 40 local practice-area searches',
      'Asking ChatGPT, Perplexity and AI Overviews who to hire',
      'Scoring citations and directory mentions',
    ],
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
