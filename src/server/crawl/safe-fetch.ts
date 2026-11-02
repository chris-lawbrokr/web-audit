import 'server-only';

import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/*
 * Fetching a page from a visitor-supplied domain (06 §4.1). The server must never be talked into
 * requesting an internal address, so every hop, redirects included, has to resolve to public IPs only,
 * on the standard ports, within a deadline and a size cap.
 *
 * Known gap: the address is checked, then fetch resolves the name again, so a DNS server that answers
 * differently the second time (rebinding) could slip through. Pinning the checked IP needs an undici
 * dispatcher; worth adding before this runs anywhere but a developer's machine.
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; LawbrokrAudit/1.0; +https://lawbrokr.com/audit)';

const PRIVATE = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  PRIVATE.addSubnet(network, prefix, 'ipv4');
}
PRIVATE.addAddress('::', 'ipv6');
PRIVATE.addAddress('::1', 'ipv6');
PRIVATE.addSubnet('fc00::', 7, 'ipv6');
PRIVATE.addSubnet('fe80::', 10, 'ipv6');
PRIVATE.addSubnet('ff00::', 8, 'ipv6');

function isPrivate(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return PRIVATE.check(mapped, 'ipv4');
  return PRIVATE.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
}

async function assertPublic(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivate(address))) {
    throw new Error(`${hostname} doesn't resolve to a public address`);
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export interface FetchedPage {
  url: string;
  html: string;
}

/** An HTML page from a public host, or null if it isn't one (not HTML, an error status, too many hops). */
export async function fetchPublicHtml(
  start: string,
  { timeoutMs = 12_000, maxBytes = 2_000_000, maxRedirects = 4 } = {},
): Promise<FetchedPage | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = new URL(start);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.port !== '' && url.port !== '80' && url.port !== '443') return null;
    if (url.username !== '' || url.password !== '') return null;
    await assertPublic(url.hostname);

    const response = await fetch(url, {
      redirect: 'manual',
      signal,
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) {
      await response.body?.cancel();
      return null;
    }
    return { url: url.toString(), html: await readCapped(response, maxBytes) };
  }
  return null;
}
