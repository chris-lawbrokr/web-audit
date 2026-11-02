import type { ApiError } from '@/shared/audit/contracts';
import { BASE_PATH } from '@/shared/config/base-path';

/** A failed API call, carrying the server's message and any per-field errors. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Calls this app's API from the browser. fetch doesn't add the base path, so this does. */
export async function callApi<T>(
  path: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(`${BASE_PATH}/api${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
  const failure = (await response.json().catch(() => null)) as ApiError | null;
  throw new ApiRequestError(
    failure?.error.message ?? 'Something went wrong. Please try again.',
    failure?.error.code ?? 'unknown',
    failure?.error.fields,
  );
}
