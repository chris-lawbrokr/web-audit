import 'server-only';

import { env } from '@/server/config/env';

import { cached } from './cache';
import type { Spend } from './request';
import { ProviderError, fetchWithTimeout } from './request';

/*
 * Semrush (05 §4): estimated monthly visits from Google search. Lawbrokr's key has the Standard API
 * but not the Trends API, so total visits, bounce rate and traffic sources aren't available.
 * Answers are semicolon-separated text, not JSON.
 */

/** 10 API units for each domain Semrush has data for; unknown domains cost nothing. */
const UNITS_PER_DOMAIN = 10;

export interface SearchTraffic {
  /** Estimated monthly visits from Google's organic results (Semrush's "Ot"). */
  visits: number;
  /** Keywords the domain ranks for in Google's top 100 ("Or"). */
  keywords: number;
}

/**
 * Null when Semrush has no data for the domain, which is common for small sites. An answer from the
 * last 24 hours, "no data" included, is reused instead of paid for again.
 */
export function searchTraffic(domain: string, spend: Spend): Promise<SearchTraffic | null> {
  return cached(
    `semrush domain_rank us ${domain}`,
    () => fetchSearchTraffic(domain, spend),
    () => (spend.reused += 1),
  );
}

async function fetchSearchTraffic(domain: string, spend: Spend): Promise<SearchTraffic | null> {
  const url = new URL('https://api.semrush.com/');
  url.search = new URLSearchParams({
    type: 'domain_rank',
    key: env.SEMRUSH_API_KEY,
    domain,
    database: 'us',
    export_columns: 'Dn,Or,Ot',
  }).toString();

  const response = await fetchWithTimeout('Semrush', url.toString(), { timeoutMs: 20_000 });
  const body = (await response.text()).trim();
  // Semrush reports errors in the body, with HTTP 200.
  if (body.startsWith('ERROR 50 ')) return null;
  if (!response.ok || body.startsWith('ERROR')) {
    throw new ProviderError('Semrush', body.slice(0, 120) || `HTTP ${response.status}`);
  }

  const [, row] = body.split(/\r?\n/);
  const [, keywords, visits] = (row ?? '').split(';').map(Number);
  if (keywords === undefined || visits === undefined || Number.isNaN(keywords + visits)) {
    throw new ProviderError('Semrush', `unexpected answer for ${domain}`);
  }
  spend.semrushUnits += UNITS_PER_DOMAIN;
  return { visits, keywords };
}
