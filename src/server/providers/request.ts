import 'server-only';

/** What one audit has spent with the paid providers, logged when it finishes. */
export interface Spend {
  dataForSeoUsd: number;
  semrushUnits: number;
}

export const noSpend = (): Spend => ({ dataForSeoUsd: 0, semrushUnits: 0 });

/** A provider call that failed: an error status, a timeout, or an answer we couldn't read. */
export class ProviderError extends Error {
  constructor(provider: string, message: string) {
    super(`${provider}: ${message}`);
    this.name = 'ProviderError';
  }
}

/** `fetch` with a deadline, never cached, and failures reported as a ProviderError. */
export async function fetchWithTimeout(
  provider: string,
  url: string,
  init: RequestInit & { timeoutMs: number },
): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  try {
    return await fetch(url, { ...rest, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new ProviderError(
      provider,
      timedOut ? `no answer within ${timeoutMs / 1000}s` : String(error),
    );
  }
}
