import 'server-only';

import type { PracticeArea } from '@/shared/audit/checks';

/*
 * Which kind of law the firm practices, by rules rather than an AI step: Google's category for the
 * firm comes first (the firm picked it), then the words on its homepage. It decides which searches the
 * audit runs and which nearby firms count as competitors.
 */

type KnownArea = Exclude<PracticeArea, 'Other'>;

const RULES: Record<KnownArea, { pattern: RegExp; searches: readonly [string, string] }> = {
  // Before personal injury: "workers' compensation" pages also talk about injuries.
  'Workers’ compensation': {
    pattern: /\bworkers['’]? ?comp(?:ensation)?\b/gi,
    searches: ['workers comp lawyer', 'workers compensation attorney'],
  },
  'Personal injury': {
    pattern:
      /\b(?:personal injury|(?:car|auto|truck|motorcycle) accidents?|wrongful death|slip and fall|injury (?:lawyer|attorney)s?)\b/gi,
    searches: ['personal injury lawyer', 'car accident lawyer'],
  },
  'Family law': {
    pattern: /\b(?:family law|divorce|child custody|child support|alimony)\b/gi,
    searches: ['divorce lawyer', 'family law attorney'],
  },
  'Estates & probate': {
    pattern: /\b(?:estate planning|probate|wills? (?:and|&) trusts?|living trusts?|elder law)\b/gi,
    searches: ['estate planning attorney', 'probate lawyer'],
  },
  'Criminal defense': {
    pattern: /\b(?:criminal (?:defen[cs]e|lawyer|attorney|justice)|dui|dwi|drug charges?)\b/gi,
    searches: ['criminal defense lawyer', 'DUI lawyer'],
  },
  Immigration: {
    pattern: /\b(?:immigration|green cards?|deportation|citizenship|asylum)\b/gi,
    searches: ['immigration lawyer', 'immigration attorney'],
  },
  'Employment law': {
    pattern:
      /\b(?:employment (?:law|lawyer|attorney)s?|wrongful termination|workplace discrimination|sexual harassment|unpaid wages)\b/gi,
    searches: ['employment lawyer', 'wrongful termination lawyer'],
  },
  'Business & corporate': {
    pattern: /\b(?:business (?:law|lawyer|attorney)s?|corporate (?:law|lawyer|attorney)s?)\b/gi,
    searches: ['business lawyer', 'business attorney'],
  },
  'Real estate': {
    pattern: /\b(?:real estate (?:law|lawyer|attorney|closings?)s?|landlord|title insurance)\b/gi,
    searches: ['real estate attorney', 'real estate lawyer'],
  },
};

const AREAS = Object.keys(RULES) as KnownArea[];

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;

export function practiceAreaOf(googleCategory: string | null, siteText: string): KnownArea | null {
  if (googleCategory) {
    const byCategory = AREAS.find((area) => count(googleCategory, RULES[area].pattern) > 0);
    if (byCategory) return byCategory;
  }
  let best: KnownArea | null = null;
  let bestCount = 0;
  for (const area of AREAS) {
    const hits = count(siteText, RULES[area].pattern);
    if (hits > bestCount) {
      best = area;
      bestCount = hits;
    }
  }
  return best;
}

/** Two ways people search for this kind of lawyer; generic ones when the area is unknown. */
export function searchTermsFor(area: KnownArea | null): readonly [string, string] {
  return area ? RULES[area].searches : ['lawyer', 'law firm'];
}

/** Whether a Google Maps category names a lawyer or law firm at all. */
export const isLegalCategory = (categories: readonly string[]) =>
  categories.some((category) => /\b(?:attorney|lawyer|law firm|legal|solicitor)\b/i.test(category));
