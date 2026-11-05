import 'server-only';

/*
 * Provider answers, kept for 24 hours so re-auditing a domain doesn't pay for (or wait on) the same calls
 * again. Nearby audits share it too: a competitor's traffic looked up for one firm is reused for the
 * next. Only answers are kept, so a call that failed is made again next time. Two audits asking the
 * same thing at once share one call.
 *
 * IN MEMORY, like the audit store: lost on restart and not shared between Vercel instances. It moves to
 * Postgres with the store.
 */

const TTL_MS = 24 * 60 * 60 * 1000;
/** Far more than local testing needs; past it, the oldest answers go first. */
const MAX_ENTRIES = 5_000;

interface Entry {
  expires: number;
  value: Promise<unknown>;
}

// On globalThis so development hot reloads, which re-evaluate this module, don't empty it.
const holder = globalThis as typeof globalThis & { lawbrokrProviderCache?: Map<string, Entry> };
holder.lawbrokrProviderCache ??= new Map();
const entries = holder.lawbrokrProviderCache;

/** Every entry lives 24 hours and the Map keeps insertion order, so the oldest are always first. */
function prune(now: number) {
  for (const [key, entry] of entries) {
    if (entries.size <= MAX_ENTRIES && entry.expires > now) return;
    entries.delete(key);
  }
}

/**
 * `load()`'s answer, or the one kept under `key` if it's under 24 hours old, in which case `onHit` runs
 * instead of the call. Each caller gets its own copy, so no audit can change another's answer.
 */
export async function cached<T>(
  key: string,
  load: () => Promise<T>,
  onHit?: () => void,
): Promise<T> {
  const now = Date.now();
  const kept = entries.get(key);
  if (kept && kept.expires > now) {
    onHit?.();
    return structuredClone((await kept.value) as T);
  }

  const value = load();
  const entry: Entry = { expires: now + TTL_MS, value };
  entries.delete(key);
  entries.set(key, entry);
  prune(now);
  // A failure isn't kept: the next audit tries again.
  value.catch(() => {
    if (entries.get(key) === entry) entries.delete(key);
  });
  return structuredClone(await value);
}
