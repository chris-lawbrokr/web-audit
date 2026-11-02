import 'server-only';

import type { z } from 'zod';

import type { ApiError } from '@/shared/audit/contracts';

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): Response {
  const body: ApiError = { error: { code, message, ...(fields && { fields }) } };
  return Response.json(body, { status });
}

/** Parses a JSON body against a schema; on failure, the 400 or 422 response to send instead. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: apiError(400, 'invalid_json', 'The request body must be JSON.') };
  }
  const result = schema.safeParse(json);
  if (result.success) return { data: result.data };

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.') || 'body';
    fields[key] ??= issue.message;
  }
  return { response: apiError(422, 'invalid_fields', 'Some fields need fixing.', fields) };
}
