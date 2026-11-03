import 'server-only';

import type { CheckKey } from '@/shared/audit/checks';
import type { Discovery, HomepageFacts } from '@/shared/audit/contracts';
import { formatNumber } from '@/shared/lib/format';

import type { SiteFacts } from '../crawl/homepage';
import { readHomepage } from '../crawl/homepage';
import type { Assistant, LatLng, Place, SearchResults } from '../providers/dataforseo';
import { askAssistant, searchGoogle, searchMaps } from '../providers/dataforseo';
import { pageSpeed } from '../providers/pagespeed';
import type { Spend } from '../providers/request';
import { noSpend } from '../providers/request';
import { searchTraffic } from '../providers/semrush';
import type { Identity } from './identity';
import {
  answerMentions,
  bareHost,
  distinctiveWords,
  mentionsName,
  milesBetween,
  phoneDigits,
  placeName,
  sameSite,
  stateCode,
} from './identity';
import { isLegalCategory, practiceAreaOf, searchTermsFor } from './practice-areas';
import type { CheckState } from './store';
import { findAudit, updateAudit } from './store';
import type {
  AnswerCheck,
  Business,
  Competitor,
  Outcome,
  PartialResults,
  ReviewsResult,
  SearchCheck,
  SpeedResult,
  TrafficResult,
  VisibilityResult,
} from './types';
import { LCP_TARGET_SECONDS, measured, unmeasured } from './types';

/*
 * The scan (04-backend §5), run in the background of the request that starts it. Every number comes
 * from a provider during this run. A check whose provider fails or has no data settles as
 * "unmeasured" with a reason the report shows; nothing is estimated or filled in.
 *
 * Runs in-process, which works on a long-lived local server. On Vercel it moves to Vercel Workflows.
 */

const COMPETITOR_RADIUS_MILES = 10;
const COMPETITOR_COUNT = 3;
const ASSISTANTS: readonly Assistant[] = ['ChatGPT', 'Perplexity'];

const REASON = {
  unreachable:
    'We couldn’t reach the data source for this check. Running the audit again may work.',
  noProfile:
    'We couldn’t find a Google Business Profile for this website, so there are no reviews to compare.',
  noSpeed:
    'Google’s speed test didn’t return a result for this website. Running the audit again may work.',
  noTraffic:
    'Semrush has no search-traffic data for this website. That’s common for smaller sites.',
  noLocation: 'We couldn’t tell where the firm is based, so we couldn’t run local searches.',
};

/** What the scan learns about the firm, which the later checks build on. */
interface Firm {
  domain: string;
  identity: Identity;
  city: string | null;
  region: string | null;
  location: LatLng | null;
  area: ReturnType<typeof practiceAreaOf>;
}

const unique = (values: readonly (string | null | undefined)[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

function describeFirm(domain: string, site: SiteFacts | null, profile: Place | null): Firm {
  const city = profile?.city ?? site?.city ?? null;
  return {
    domain,
    identity: {
      names: unique([profile?.name, ...(site?.names ?? [])]),
      domain,
      cid: profile?.cid ?? null,
      ignore: city ? distinctiveWords(city) : [],
    },
    city,
    region: profile?.region ?? site?.region ?? null,
    location: profile?.location ?? null,
    area: practiceAreaOf(profile?.category ?? null, `${site?.title ?? ''} ${site?.text ?? ''}`),
  };
}

/** "+1-818-555-0100" → "(818) 555-0100"; anything that isn't a US number stays as the site wrote it. */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return local.length === 10
    ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
    : phone;
}

/** The homepage's facts on their own, for the report's "What your homepage told us". */
const homepageFactsOf = (site: SiteFacts): HomepageFacts => ({
  // "https://firm.com/" reads as "https://firm.com".
  url: site.url.replace(/\/$/, ''),
  name: site.names[0] ?? null,
  phone: site.phone ? formatPhone(site.phone) : null,
  place: site.city ? placeName(site.city, site.region) : null,
  practiceArea: practiceAreaOf(null, `${site.title} ${site.text}`),
});

const businessOf = (place: Place): Business => ({
  name: place.name,
  domain: place.domain ? bareHost(place.domain) : null,
  cid: place.cid,
  rating: place.rating,
  reviews: place.reviews,
});

const identityOf = (business: Business, ignore: readonly string[]): Identity => ({
  names: [business.name],
  domain: business.domain,
  cid: business.cid,
  ignore,
});

/** "Hartley & Moss" → "HM": the capitalized words' first letters, two at most. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('');

const seconds = (value: number) => `${value.toFixed(1)}s`;

// --- Reviews -----------------------------------------------------------------------------------------

/** The firm's Google listing: a Maps search for its address, then for its name and city. */
async function findProfile(
  domain: string,
  site: SiteFacts | null,
  spend: Spend,
): Promise<Place | null> {
  const sitePhone = phoneDigits(site?.phone);
  const ours = (place: Place) =>
    sameSite(place.domain, domain) ||
    (sitePhone.length === 10 && phoneDigits(place.phone) === sitePhone);

  const byAddress = (await searchMaps(domain, null, spend)).find(ours);
  if (byAddress) return byAddress;

  const name = site?.names[0];
  if (!name) return null;
  const keyword = [name, site.city, stateCode(site.region) ?? site.region]
    .filter(Boolean)
    .join(' ');
  return (await searchMaps(keyword, null, spend)).find(ours) ?? null;
}

/** The first law firms Google Maps lists for the firm's kind of law near its office. */
async function findCompetitors(firm: Firm, spend: Spend): Promise<Competitor[]> {
  if (!firm.location && !firm.city) return [];
  const [term] = searchTermsFor(firm.area);
  const keyword =
    firm.location || !firm.city ? term : `${term} ${placeName(firm.city, firm.region)}`;
  const places = await searchMaps(keyword, firm.location, spend);

  const seen = new Set<string>();
  const competitors: Competitor[] = [];
  for (const place of places) {
    if (!place.domain || !isLegalCategory(place.categories)) continue;
    if (
      sameSite(place.domain, firm.domain) ||
      (firm.identity.cid && place.cid === firm.identity.cid)
    ) {
      continue;
    }
    const host = bareHost(place.domain);
    if (seen.has(host)) continue;
    const miles =
      firm.location && place.location ? milesBetween(firm.location, place.location) : null;
    if (miles !== null && miles > COMPETITOR_RADIUS_MILES) continue;
    seen.add(host);
    competitors.push({ ...businessOf(place), miles });
    if (competitors.length === COMPETITOR_COUNT) break;
  }
  return competitors;
}

// --- Speed -------------------------------------------------------------------------------------------

async function checkSpeed(domain: string): Promise<Outcome<SpeedResult>> {
  const url = `https://${domain}/`;
  const [phone, desktop] = await Promise.allSettled([
    // A slow site's phone test can take two minutes. Desktop is secondary, so it gets less time:
    // waiting on it holds up the whole scan.
    pageSpeed(url, 'mobile', 130_000),
    pageSpeed(url, 'desktop', 75_000),
  ]);
  if (desktop.status === 'rejected') logFailure(domain, 'speed (desktop)', desktop.reason);
  if (phone.status === 'rejected') {
    logFailure(domain, 'speed (phone)', phone.reason);
    return unmeasured(REASON.noSpeed);
  }
  const device = ({
    labSeconds,
    fieldSeconds,
  }: {
    labSeconds: number;
    fieldSeconds: number | null;
  }) => ({
    labSeconds,
    fieldSeconds,
  });
  return measured({
    phone: device(phone.value),
    desktop: desktop.status === 'fulfilled' ? device(desktop.value) : null,
  });
}

function speedDiscovery({ phone }: SpeedResult): Discovery {
  return phone.fieldSeconds !== null
    ? {
        id: 'speed',
        icon: 'smartphone',
        title: `Real visitors wait ${seconds(phone.fieldSeconds)} for your homepage on a phone`,
        detail: `From Chrome’s data on actual visits. Google’s target is ${LCP_TARGET_SECONDS}s.`,
      }
    : {
        id: 'speed',
        icon: 'smartphone',
        title: `Your homepage took ${seconds(phone.labSeconds)} to load in Google’s phone test`,
        detail: `Google’s target is ${LCP_TARGET_SECONDS}s.`,
      };
}

// --- Traffic -----------------------------------------------------------------------------------------

async function checkTraffic(
  firm: Firm,
  competitors: readonly Competitor[],
  spend: Spend,
  step: (index: number) => void,
  discover: (discovery: Discovery) => void,
): Promise<Outcome<TrafficResult>> {
  const own = await searchTraffic(firm.domain, spend);
  discover(
    own
      ? {
          id: 'traffic',
          icon: 'trending-up',
          title: `About ${formatNumber(own.visits)} visits a month from Google`,
          detail: 'Semrush’s estimate of the people who find you through search.',
        }
      : {
          id: 'traffic',
          icon: 'trending-up',
          title: 'Not enough search data to estimate your visits',
          detail: 'Common for smaller sites.',
        },
  );
  if (!own) return unmeasured(REASON.noTraffic);

  step(1);
  const theirs = await Promise.all(
    competitors.map(async (competitor) => {
      if (!competitor.domain) return null;
      try {
        const traffic = await searchTraffic(competitor.domain, spend);
        return traffic ? { name: competitor.name, visits: traffic.visits } : null;
      } catch (error) {
        logFailure(firm.domain, `traffic for ${competitor.domain}`, error);
        return null;
      }
    }),
  );
  return measured({
    firmVisits: own.visits,
    competitors: theirs.filter((competitor) => competitor !== null),
  });
}

// --- Visibility --------------------------------------------------------------------------------------

function searchCheck(
  query: string,
  results: SearchResults,
  firm: Identity,
  competitors: readonly Identity[],
): SearchCheck {
  const inLocalPack = (who: Identity) =>
    results.localPack.some(
      (listing) =>
        (who.cid !== null && listing.cid === who.cid) ||
        (who.domain !== null && sameSite(listing.domain, who.domain)) ||
        mentionsName(listing.name, who.names, who.ignore),
    );
  const rankOf = ({ domain }: Identity) =>
    domain === null
      ? null
      : (results.organic.find((result) => sameSite(result.domain, domain))?.rank ?? null);

  return {
    query,
    firmRank: rankOf(firm),
    firmInLocalPack: inLocalPack(firm),
    competitorsShown: competitors
      .filter((who) => inLocalPack(who) || (rankOf(who) ?? Infinity) <= 10)
      .map((who) => who.names[0] ?? ''),
  };
}

async function checkVisibility(
  firm: Firm,
  competitors: readonly Competitor[],
  spend: Spend,
  step: (index: number) => void,
  discover: (discovery: Discovery) => void,
): Promise<Outcome<VisibilityResult>> {
  if (!firm.city) return unmeasured(REASON.noLocation);

  const place = placeName(firm.city, firm.region);
  const [first, second] = searchTermsFor(firm.area);
  const near = firm.location;
  // "Near me" only means something when the search runs from the firm's coordinates.
  const queries = near
    ? [`${first} ${place}`, `best ${first} near me`, `${second} ${place}`, `${second} near me`]
    : [
        `${first} ${place}`,
        `best ${first} in ${place}`,
        `${second} ${place}`,
        `best ${second} in ${place}`,
      ];
  const questions = [
    `Who are the best ${first}s in ${place}? I need to hire one.`,
    `Can you recommend a good ${second} in ${place}?`,
  ];
  const rivals = competitors.map((competitor) => identityOf(competitor, firm.identity.ignore));
  const mentionedRivals = (answer: Parameters<typeof answerMentions>[0]) =>
    competitors
      .filter((_, index) => {
        const rival = rivals[index];
        return rival !== undefined && answerMentions(answer, rival);
      })
      .map((competitor) => competitor.name);

  // Google AI Overviews load on the first two searches only: they add about 15 seconds each.
  const searching = Promise.allSettled(
    queries.map((query, index) => searchGoogle(query, near, index < 2, spend)),
  ).then((settled) => {
    step(1);
    discover({
      id: 'searches',
      icon: 'search',
      title: `Ran ${queries.length} Google searches near ${place}`,
      detail: `Like “${queries[0] ?? ''}”, looking for you in the results and the map pack.`,
    });
    return settled;
  });
  const asking = Promise.allSettled(
    questions.flatMap((question) =>
      ASSISTANTS.map(async (assistant) => ({
        assistant,
        question,
        answer: await askAssistant(assistant, question, firm.city, spend),
      })),
    ),
  );
  const [searched, asked] = await Promise.all([searching, asking]);

  const searches: SearchCheck[] = [];
  const answers: AnswerCheck[] = [];
  searched.forEach((outcome, index) => {
    const query = queries[index] ?? '';
    if (outcome.status === 'rejected') {
      logFailure(firm.domain, `search “${query}”`, outcome.reason);
      return;
    }
    searches.push(searchCheck(query, outcome.value, firm.identity, rivals));
    const overview = outcome.value.aiOverview;
    if (overview) {
      answers.push({
        source: 'Google AI Overview',
        question: query,
        firmMentioned: answerMentions(overview, firm.identity),
        competitorsMentioned: mentionedRivals(overview),
      });
    }
  });
  for (const outcome of asked) {
    if (outcome.status === 'rejected') {
      logFailure(firm.domain, 'AI question', outcome.reason);
      continue;
    }
    const { assistant, question, answer } = outcome.value;
    if (!answer) continue;
    answers.push({
      source: assistant,
      question,
      firmMentioned: answerMentions(answer, firm.identity),
      competitorsMentioned: mentionedRivals(answer),
    });
  }

  const sources = unique(answers.map((answer) => answer.source));
  if (sources.length > 0) {
    discover({
      id: 'ai',
      icon: 'sparkles',
      title: 'Asked AI assistants who to hire near you',
      detail: 'Which ones named you is in your report.',
      chips: sources,
    });
  }
  if (searches.length === 0 && answers.length === 0) return unmeasured(REASON.unreachable);
  return measured({
    place,
    competitors: competitors.map((competitor) => competitor.name),
    searches,
    answers,
  });
}

// --- The run -----------------------------------------------------------------------------------------

function logFailure(domain: string, what: string, error: unknown) {
  console.error(
    `[audit] ${domain} · ${what} failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

export async function runAudit(auditId: string): Promise<void> {
  const audit = findAudit(auditId);
  if (!audit) return;
  const { domain } = audit;
  const spend = noSpend();
  const started = Date.now();

  const setCheck = (key: CheckKey, state: CheckState) =>
    updateAudit(auditId, (current) => ({
      ...current,
      checks: { ...current.checks, [key]: state },
    }));
  const stepper = (key: CheckKey) => (index: number) =>
    setCheck(key, { status: 'running', step: index });
  const discover = (discovery: Discovery) =>
    updateAudit(auditId, (current) => ({
      ...current,
      discoveries: [...current.discoveries, discovery],
    }));

  /** Runs one check; a thrown error settles it as unmeasured instead of failing the audit. */
  async function settle<T>(key: CheckKey, run: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
    let outcome: Outcome<T>;
    try {
      outcome = await run();
    } catch (error) {
      logFailure(domain, key, error);
      outcome = unmeasured(REASON.unreachable);
    }
    updateAudit(auditId, (current) => ({
      ...current,
      results: { ...current.results, [key]: outcome } as PartialResults,
      checks: { ...current.checks, [key]: { status: 'done', step: 0 } },
    }));
    return outcome;
  }

  try {
    // Speed needs only the address and is the slowest call, so it starts first.
    stepper('speed')(0);
    const speedDone = settle('speed', () => checkSpeed(domain)).then((outcome) => {
      if (outcome.ok) discover(speedDiscovery(outcome.value));
    });

    // Who and where the firm is, then who's nearby: everything after this compares against them.
    const reviewsStep = stepper('reviews');
    reviewsStep(0);
    const site = await readHomepage(domain);
    updateAudit(auditId, (current) => ({
      ...current,
      homepage: site ? homepageFactsOf(site) : null,
    }));
    reviewsStep(1);
    let firm = describeFirm(domain, site, null);
    let competitors: Competitor[] = [];
    await settle<ReviewsResult>('reviews', async () => {
      const profile = await findProfile(domain, site, spend);
      firm = describeFirm(domain, site, profile);
      discover(
        profile
          ? {
              id: 'profile',
              icon: 'map-pin',
              title: 'Found your Google Business Profile',
              detail:
                profile.rating === null
                  ? 'No Google reviews yet.'
                  : `${profile.rating.toFixed(1)} rating from ${formatNumber(profile.reviews)} reviews`,
            }
          : {
              id: 'profile',
              icon: 'map-pin',
              title: 'We couldn’t find your Google Business Profile',
              detail: `Searched Google Maps for ${domain}${site?.names[0] ? ` and “${site.names[0]}”` : ''}.`,
            },
      );

      reviewsStep(2);
      competitors = await findCompetitors(firm, spend);
      updateAudit(auditId, (current) => ({ ...current, competitorCount: competitors.length }));
      if (competitors.length > 0) {
        const within = competitors.every((competitor) => competitor.miles !== null)
          ? `within ${COMPETITOR_RADIUS_MILES} miles`
          : 'nearby';
        discover({
          id: 'competitors',
          icon: 'users',
          title: `Spotted ${competitors.length} ${competitors.length === 1 ? 'competitor' : 'competitors'} ${within}`,
          detail: competitors.map((competitor) => competitor.name).join(', '),
          avatars: competitors.map((competitor) => initials(competitor.name)),
        });
      }
      return profile
        ? measured({ firm: businessOf(profile), competitors })
        : unmeasured(REASON.noProfile);
    });

    stepper('traffic')(0);
    stepper('visibility')(0);
    await Promise.all([
      speedDone,
      settle('traffic', () => checkTraffic(firm, competitors, spend, stepper('traffic'), discover)),
      settle('visibility', () =>
        checkVisibility(firm, competitors, spend, stepper('visibility'), discover),
      ),
    ]);
  } catch (error) {
    logFailure(domain, 'audit', error);
  } finally {
    // Whatever didn't settle (only possible after an unexpected error) is unmeasured, never blank.
    updateAudit(auditId, (current) => {
      const results: PartialResults = { ...current.results };
      for (const key of Object.keys(current.checks) as CheckKey[]) {
        if (!results[key]) Object.assign(results, { [key]: unmeasured(REASON.unreachable) });
      }
      const checks = Object.fromEntries(
        Object.keys(current.checks).map((key) => [key, { status: 'done', step: 0 }]),
      ) as typeof current.checks;
      return { ...current, results, checks, spend, completedAt: Date.now() };
    });
    console.info(
      `[audit] ${domain} finished in ${Math.round((Date.now() - started) / 1000)}s · ` +
        `DataForSEO $${spend.dataForSeoUsd.toFixed(3)} · Semrush ${spend.semrushUnits} units`,
    );
  }
}
