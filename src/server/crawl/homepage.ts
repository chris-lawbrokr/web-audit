import 'server-only';

import { fetchPublicHtml } from './safe-fetch';

/*
 * What the firm's own homepage says about it: its name, where it is and its phone number (from the
 * schema.org data most law-firm sites carry), plus the visible text for practice-area matching.
 */

export interface SiteFacts {
  /** The firm's name as the site gives it, most reliable first. */
  names: string[];
  city: string | null;
  /** A state name or abbreviation, as the site wrote it. */
  region: string | null;
  phone: string | null;
  title: string;
  /** The page's visible text, for practice-area matching. */
  text: string;
}

/** The types a law firm describes itself with; LegalService and its kin outrank Organization. */
const FIRM_TYPES = ['LegalService', 'Attorney', 'LawFirm', 'LocalBusiness', 'ProfessionalService'];
const ORG_TYPES = ['Organization', 'Corporation'];

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decode(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (!code.startsWith('#')) return ENTITIES[code.toLowerCase()] ?? entity;
      const point =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const metaContent = (html: string, property: string) =>
  new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)`, 'i').exec(
    html,
  )?.[1];

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every object in the page's JSON-LD blocks, @graph and arrays flattened. */
function jsonLdNodes(html: string): JsonObject[] {
  const nodes: JsonObject[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (isObject(value)) {
      nodes.push(value);
      if ('@graph' in value) visit(value['@graph']);
    }
  };
  for (const [, block] of html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(block ?? ''));
    } catch {
      // A malformed block is common and harmless: skip it.
    }
  }
  return nodes;
}

const typesOf = (node: JsonObject): string[] => {
  const type = node['@type'];
  return (Array.isArray(type) ? type : [type]).filter((t): t is string => typeof t === 'string');
};
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? decode(value) : null);

function addressOf(node: JsonObject): { city: string | null; region: string | null } | null {
  const raw = Array.isArray(node['address']) ? node['address'][0] : node['address'];
  if (!isObject(raw)) return null;
  const city = text(raw['addressLocality']);
  return city ? { city, region: text(raw['addressRegion']) } : null;
}

/** "Roman Austin Injury Lawyers — Clearwater" → "Roman Austin Injury Lawyers". */
const firmName = (name: string) => name.split(/\s+[—–|]\s+/)[0]?.trim() ?? name;

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).slice(0, 150_000);
}

export function factsFrom(html: string): SiteFacts {
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  const nodes = jsonLdNodes(html);
  const firms = nodes.filter((node) => typesOf(node).some((type) => FIRM_TYPES.includes(type)));
  const orgs = nodes.filter((node) => typesOf(node).some((type) => ORG_TYPES.includes(type)));

  const address = [...firms, ...orgs].map(addressOf).find(Boolean) ?? null;
  const phone =
    [...firms, ...orgs].map((node) => text(node['telephone'])).find(Boolean) ??
    /href=["']tel:([^"']+)/i.exec(html)?.[1] ??
    null;

  // "Personal Injury Lawyers | Dolman Law Group": the brand is usually the title's last segment.
  const titleBrand = title.split(/\s+[|—–-]\s+/).at(-1);
  const names = [
    text(metaContent(html, 'og:site_name')),
    ...firms.map((node) => text(node['name'])),
    ...orgs.map((node) => text(node['name'])),
    titleBrand && titleBrand.length <= 60 ? titleBrand : null,
  ]
    .filter((name): name is string => Boolean(name))
    .map(firmName);

  return {
    names: [...new Set(names)],
    city: address?.city ?? null,
    region: address?.region ?? null,
    phone,
    title,
    text: visibleText(html),
  };
}

/** The homepage's facts, or null if no version of the address answers with a page. */
export async function readHomepage(domain: string): Promise<SiteFacts | null> {
  for (const candidate of [`https://${domain}/`, `https://www.${domain}/`, `http://${domain}/`]) {
    try {
      const page = await fetchPublicHtml(candidate);
      if (page) return factsFrom(page.html);
    } catch {
      // Unreachable, refused or private: try the next form of the address.
    }
  }
  return null;
}
