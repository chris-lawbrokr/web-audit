import 'server-only';

import type { LatLng } from '@/server/providers/dataforseo';

/*
 * Recognizing a firm wherever it turns up: in search results by its website, in the map pack by its
 * Google listing, and in AI answers by its name or a cited link.
 */

/** "WWW.Example.com." → "example.com". */
export const bareHost = (host: string) =>
  host
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^www\./, '');

/** The same site, or one of its subdomains. */
export function sameSite(host: string | null | undefined, domain: string): boolean {
  if (!host) return false;
  const a = bareHost(host);
  const b = bareHost(domain);
  return a === b || a.endsWith(`.${b}`);
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** The last ten digits, so +1 (727) 451-6900 and 727.451.6900 compare equal. */
export const phoneDigits = (phone: string | null | undefined) =>
  (phone ?? '').replace(/\D/g, '').slice(-10);

/** Words that say what a firm does rather than which firm it is. */
const GENERIC = new Set(
  (
    'law laws lawyer lawyers attorney attorneys firm firms group office offices legal the and for ' +
    'pa p.a pc p.c llc pllc llp ltd inc esq associates partners services center centre justice ' +
    'injury injuries personal accident accidents car auto truck trial family divorce criminal ' +
    'defense immigration estate estates planning probate employment business corporate real ' +
    'workers compensation dui counsel advocates company home welcome page official site website contact'
  ).split(' '),
);

/** The words that identify a firm: "Dolman Law Group Accident Injury Lawyers, PA" → ["dolman"]. */
export function distinctiveWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9&'\s.-]/g, ' ')
    .split(/[\s&]+/)
    .map((word) => word.replace(/^[.'-]+|[.'-]+$/g, ''))
    .filter((word) => word.length >= 3 && !GENERIC.has(word));
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether any of the names appears in the text: its first two distinctive words (or its only one) in
 * the same paragraph. Words in `ignore`, like the firm's city, never count: "Clearwater Injury Law"
 * would otherwise match every answer about Clearwater.
 */
export function mentionsName(
  text: string,
  names: readonly string[],
  ignore: readonly string[] = [],
): boolean {
  const paragraphs = text.toLowerCase().split(/\n+/);
  return names.some((name) => {
    const words = distinctiveWords(name)
      .filter((word) => !ignore.includes(word))
      .slice(0, 2);
    if (words.length === 0) return false;
    const patterns = words.map((word) => new RegExp(`\\b${escape(word)}\\b`));
    return paragraphs.some((paragraph) => patterns.every((pattern) => pattern.test(paragraph)));
  });
}

/** A firm as the matching rules need it. */
export interface Identity {
  names: readonly string[];
  domain: string | null;
  cid: string | null;
  /** Words that don't identify it, like its city: see mentionsName. */
  ignore: readonly string[];
}

/** Named in the answer, or one of its links cited. */
export function answerMentions(
  answer: { text: string; citedUrls?: readonly string[]; citedDomains?: readonly string[] },
  firm: Identity,
): boolean {
  if (mentionsName(answer.text, firm.names, firm.ignore)) return true;
  if (!firm.domain) return false;
  const domain = firm.domain;
  if (answer.text.toLowerCase().includes(bareHost(domain))) return true;
  return (
    (answer.citedUrls ?? []).some((url) => sameSite(hostOf(url), domain)) ||
    (answer.citedDomains ?? []).some((host) => sameSite(host, domain))
  );
}

/** Great-circle distance in miles. */
export function milesBetween(a: LatLng, b: LatLng): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

/** "Florida" or "fl" → "FL"; anything else → null. */
export function stateCode(region: string | null): string | null {
  if (!region) return null;
  const upper = region.trim().toUpperCase();
  if (upper in STATES) return upper;
  return Object.entries(STATES).find(([, name]) => name.toUpperCase() === upper)?.[0] ?? null;
}

/** "Clearwater, FL", or just the city when the state is unknown. */
export function placeName(city: string, region: string | null): string {
  const state = stateCode(region);
  return state ? `${city}, ${state}` : city;
}
