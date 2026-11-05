import 'server-only';

import { z } from 'zod';

import { env } from '@/server/config/env';

import { cached } from './cache';
import type { Spend } from './request';
import { ProviderError, fetchWithTimeout } from './request';

/*
 * DataForSEO (05 §2, §5, §6): Google Maps for the firm's profile and its competitors, Google's organic
 * results with the local pack and AI Overviews, and answers from ChatGPT and Perplexity. Live mode
 * only: queued tasks take minutes. Every call's cost is added to the audit's spend; an answer reused
 * from the last 24 hours costs nothing.
 */

const BASE = 'https://api.dataforseo.com/v3';
const UNITED_STATES = 2840;
const OK = 20000;
/** "No search results": an empty answer, not a failure. */
const NO_RESULTS = 40102;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const envelope = z.object({
  status_code: z.number(),
  status_message: z.string(),
  tasks: z
    .array(
      z.object({
        status_code: z.number(),
        status_message: z.string(),
        cost: z.number().nullish(),
        result: z.array(z.unknown()).nullish(),
      }),
    )
    .nullish(),
});

function liveTask(
  path: string,
  task: Record<string, unknown>,
  spend: Spend,
  timeoutMs: number,
): Promise<unknown> {
  return cached(
    `dataforseo ${path} ${JSON.stringify(task)}`,
    () => callLiveTask(path, task, spend, timeoutMs),
    () => (spend.reused += 1),
  );
}

async function callLiveTask(
  path: string,
  task: Record<string, unknown>,
  spend: Spend,
  timeoutMs: number,
): Promise<unknown> {
  const auth = Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString('base64');
  const response = await fetchWithTimeout('DataForSEO', `${BASE}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([task]),
    timeoutMs,
  });
  if (!response.ok)
    throw new ProviderError('DataForSEO', `${path} answered HTTP ${response.status}`);

  const parsed = envelope.safeParse(await response.json());
  if (!parsed.success) throw new ProviderError('DataForSEO', `${path}: unexpected response`);
  const { status_code, status_message, tasks } = parsed.data;
  if (status_code !== OK) throw new ProviderError('DataForSEO', `${path}: ${status_message}`);

  const result = tasks?.[0];
  if (!result) throw new ProviderError('DataForSEO', `${path}: no task in the response`);
  spend.dataForSeoUsd += result.cost ?? 0;
  if (result.status_code === NO_RESULTS) return null;
  if (result.status_code !== OK) {
    throw new ProviderError('DataForSEO', `${path}: ${result.status_message}`);
  }
  return result.result?.[0] ?? null;
}

const withItems = z.object({ items: z.array(z.unknown()).nullish() });

/** The result's items that match a schema; anything else is skipped rather than failing the call. */
function itemsOf<T extends z.ZodType>(result: unknown, schema: T): z.infer<T>[] {
  const items = withItems.safeParse(result).data?.items ?? [];
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const where = (near: LatLng | null) =>
  near
    ? { location_coordinate: `${near.latitude},${near.longitude},13z` }
    : { location_code: UNITED_STATES };

// --- Google Maps -------------------------------------------------------------------------------------

const mapsItem = z.object({
  type: z.literal('maps_search'),
  title: z.string(),
  domain: z.string().nullish(),
  phone: z.string().nullish(),
  category: z.string().nullish(),
  additional_categories: z.array(z.string()).nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  cid: z.string().nullish(),
  rating: z.object({ value: z.number().nullish(), votes_count: z.number().nullish() }).nullish(),
  address_info: z.object({ city: z.string().nullish(), region: z.string().nullish() }).nullish(),
});

/** A business as Google Maps lists it. */
export interface Place {
  name: string;
  domain: string | null;
  phone: string | null;
  cid: string | null;
  rating: number | null;
  reviews: number;
  category: string | null;
  categories: string[];
  location: LatLng | null;
  city: string | null;
  region: string | null;
}

/** Google Maps results for a search, in Google's order. About $0.002 a call. */
export async function searchMaps(
  keyword: string,
  near: LatLng | null,
  spend: Spend,
): Promise<Place[]> {
  const result = await liveTask(
    'serp/google/maps/live/advanced',
    { keyword, ...where(near), language_code: 'en', depth: 20 },
    spend,
    45_000,
  );
  return itemsOf(result, mapsItem).map((item) => ({
    name: item.title,
    domain: item.domain ?? null,
    phone: item.phone ?? null,
    cid: item.cid ?? null,
    rating: item.rating?.value ?? null,
    reviews: item.rating?.votes_count ?? 0,
    category: item.category ?? null,
    categories: [item.category, ...(item.additional_categories ?? [])].filter(
      (category): category is string => Boolean(category),
    ),
    location:
      item.latitude != null && item.longitude != null
        ? { latitude: item.latitude, longitude: item.longitude }
        : null,
    city: item.address_info?.city ?? null,
    region: item.address_info?.region ?? null,
  }));
}

// --- Google search -----------------------------------------------------------------------------------

const organicItem = z.object({
  type: z.literal('organic'),
  rank_group: z.number(),
  domain: z.string().nullish(),
  breadcrumb: z.string().nullish(),
  website_name: z.string().nullish(),
  title: z.string().nullish(),
});

const localPackItem = z.object({
  type: z.literal('local_pack'),
  title: z.string(),
  domain: z.string().nullish(),
  cid: z.string().nullish(),
});

const aiOverviewItem = z.object({
  type: z.literal('ai_overview'),
  markdown: z.string().nullish(),
  items: z.array(z.object({ text: z.string().nullish() })).nullish(),
  references: z
    .array(z.object({ domain: z.string().nullish(), url: z.string().nullish() }))
    .nullish(),
});

/**
 * Google sometimes links results through its own redirect, so the item's domain reads google.com; the
 * breadcrumb ("https://www.example.com › page") still names the real site.
 */
function realDomain(item: z.infer<typeof organicItem>): string | null {
  if (item.domain && !/(^|\.)google\.com$/i.test(item.domain)) return item.domain;
  const first = item.breadcrumb?.split(' › ')[0]?.trim();
  if (!first?.startsWith('http')) return null;
  try {
    return new URL(first).hostname;
  } catch {
    return null;
  }
}

export interface SearchResults {
  organic: { rank: number; domain: string | null; name: string | null }[];
  localPack: { name: string; domain: string | null; cid: string | null }[];
  /** Null when Google showed none, or showed one that didn't load. */
  aiOverview: { text: string; citedDomains: string[] } | null;
}

/**
 * Google's results for a search near a place: the top 20 organic results, the local pack and, when
 * asked for, the AI Overview (which only loads asynchronously, adding about 15 seconds).
 * About $0.0035 a call.
 */
export async function searchGoogle(
  keyword: string,
  near: LatLng | null,
  withAiOverview: boolean,
  spend: Spend,
): Promise<SearchResults> {
  const result = await liveTask(
    'serp/google/organic/live/advanced',
    {
      keyword,
      ...where(near),
      language_code: 'en',
      depth: 20,
      load_async_ai_overview: withAiOverview,
    },
    spend,
    60_000,
  );

  const overview = itemsOf(result, aiOverviewItem)[0];
  const overviewText = overview
    ? (overview.markdown ?? (overview.items ?? []).map((item) => item.text ?? '').join('\n')).trim()
    : '';
  const citedDomains = (overview?.references ?? []).flatMap((reference) =>
    reference.domain ? [reference.domain] : [],
  );

  return {
    organic: itemsOf(result, organicItem).map((item) => ({
      rank: item.rank_group,
      domain: realDomain(item),
      name: item.website_name ?? null,
    })),
    localPack: itemsOf(result, localPackItem).map((item) => ({
      name: item.title,
      domain: item.domain && !/(^|\.)google\.com$/i.test(item.domain) ? item.domain : null,
      cid: item.cid ?? null,
    })),
    aiOverview:
      overviewText || citedDomains.length > 0 ? { text: overviewText, citedDomains } : null,
  };
}

// --- AI assistants -----------------------------------------------------------------------------------

export type Assistant = 'ChatGPT' | 'Perplexity';

/** Fixed models, so answers stay comparable between audits. */
const ASSISTANTS: Record<Assistant, { path: string; model: string; takesCity: boolean }> = {
  ChatGPT: { path: 'chat_gpt', model: 'gpt-5.4-mini', takesCity: true },
  Perplexity: { path: 'perplexity', model: 'sonar', takesCity: false },
};

const llmResult = z.object({
  items: z
    .array(
      z.object({
        type: z.string(),
        sections: z
          .array(
            z.object({
              text: z.string().nullish(),
              annotations: z.array(z.object({ url: z.string().nullish() })).nullish(),
            }),
          )
          .nullish(),
      }),
    )
    .nullish(),
});

export interface AssistantAnswer {
  text: string;
  citedUrls: string[];
}

/**
 * Asks an assistant a question with web search on, as a person in the US would. ChatGPT costs about
 * $0.03 a question, Perplexity under $0.01.
 */
export async function askAssistant(
  assistant: Assistant,
  question: string,
  city: string | null,
  spend: Spend,
): Promise<AssistantAnswer | null> {
  const { path, model, takesCity } = ASSISTANTS[assistant];
  const result = await liveTask(
    `ai_optimization/${path}/llm_responses/live`,
    {
      user_prompt: question,
      model_name: model,
      web_search: true,
      web_search_country_iso_code: 'US',
      ...(takesCity && city ? { web_search_city: city } : {}),
    },
    spend,
    150_000,
  );

  // The reply is the "message" items; "reasoning" items are the model's notes to itself.
  const sections = (llmResult.safeParse(result).data?.items ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.sections ?? []);
  const text = sections
    .map((section) => section.text ?? '')
    .join('\n')
    .trim();
  if (!text) return null;
  return {
    text,
    citedUrls: sections.flatMap((section) =>
      (section.annotations ?? []).flatMap((annotation) => (annotation.url ? [annotation.url] : [])),
    ),
  };
}
