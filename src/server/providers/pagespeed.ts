import 'server-only';

import { z } from 'zod';

import { env } from '@/server/config/env';

import { cached } from './cache';
import { ProviderError, fetchWithTimeout } from './request';

/*
 * Google PageSpeed Insights (05 §3), free. One call gives two numbers:
 *  - the Lighthouse lab test: a simulated mid-range phone on slow 4G, or a desktop;
 *  - Chrome's real-visitor data (CrUX, the 75th percentile), when the site has enough Chrome traffic.
 * The two can differ widely: the lab test often reads several times slower than real visitors.
 */

const response = z.object({
  lighthouseResult: z.object({
    audits: z.object({
      'largest-contentful-paint': z.object({ numericValue: z.number().nullish() }),
    }),
    runWarnings: z.array(z.unknown()).nullish(),
    runtimeError: z.object({ code: z.string(), message: z.string().nullish() }).nullish(),
  }),
  loadingExperience: z
    .object({
      metrics: z
        .object({
          LARGEST_CONTENTFUL_PAINT_MS: z.object({ percentile: z.number() }).nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

const errorBody = z.object({ error: z.object({ message: z.string() }) });

export interface PageSpeed {
  /** Largest contentful paint in the lab test, in seconds. */
  labSeconds: number;
  /** Largest contentful paint for real Chrome visitors (75th percentile), in seconds. */
  fieldSeconds: number | null;
  /** Lighthouse warned that the page hadn't finished loading when its test ran out of time. */
  incomplete: boolean;
}

/** Free, but the slowest call in the audit, so a result from the last 24 hours is reused. */
export function pageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop',
  timeoutMs: number,
): Promise<PageSpeed> {
  return cached(`pagespeed ${strategy} ${url}`, () => runPageSpeed(url, strategy, timeoutMs));
}

async function runPageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop',
  timeoutMs: number,
): Promise<PageSpeed> {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.search = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
    key: env.GOOGLE_API_KEY,
  }).toString();

  // Google's own errors (5xx) are often momentary, so one retry; a timeout isn't retried.
  let answer = await fetchWithTimeout('PageSpeed Insights', endpoint.toString(), { timeoutMs });
  if (answer.status >= 500) {
    await answer.body?.cancel();
    answer = await fetchWithTimeout('PageSpeed Insights', endpoint.toString(), { timeoutMs });
  }
  if (!answer.ok) {
    const detail = errorBody.safeParse(await answer.json().catch(() => null)).data?.error.message;
    throw new ProviderError(
      'PageSpeed Insights',
      `${strategy} answered HTTP ${answer.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    );
  }
  const parsed = response.safeParse(await answer.json());
  if (!parsed.success) throw new ProviderError('PageSpeed Insights', 'unexpected response');

  const { lighthouseResult, loadingExperience } = parsed.data;
  if (lighthouseResult.runtimeError) {
    throw new ProviderError('PageSpeed Insights', lighthouseResult.runtimeError.code);
  }
  const lab = lighthouseResult.audits['largest-contentful-paint'].numericValue;
  if (lab == null) throw new ProviderError('PageSpeed Insights', 'no load time measured');
  const field = loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;

  return {
    labSeconds: lab / 1000,
    fieldSeconds: field == null ? null : field / 1000,
    incomplete: (lighthouseResult.runWarnings ?? []).some((warning) =>
      String(warning).includes('too slowly'),
    ),
  };
}
