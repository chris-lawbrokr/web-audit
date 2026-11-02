import 'server-only';

import { z } from 'zod';

import { BASE_PATH } from '@/shared/config/base-path';

/*
 * Every environment variable the server reads, validated once at boot (src/instrumentation.ts): with a
 * missing or malformed value the server logs every problem and fails each request until it is fixed.
 * `.env.example` lists them in the same groups as the rules below.
 */

const optionalString = z.string().optional();
const optionalUrl = z.url().optional();
const optionalSecret = z.string().min(32, 'must be at least 32 characters').optional();

const schema = z.object({
  // Set by Vercel on every deployment; absent locally.
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: optionalString,

  DATABASE_URL: optionalUrl,
  DATABASE_URL_UNPOOLED: optionalUrl,
  BLOB_READ_WRITE_TOKEN: optionalString,

  DATAFORSEO_LOGIN: optionalString,
  DATAFORSEO_PASSWORD: optionalString,
  SEMRUSH_API_KEY: optionalString,
  GOOGLE_API_KEY: optionalString,

  AUDIT_PROVIDERS: z.enum(['live', 'fixtures']).optional(),
  APP_BASE_URL: optionalUrl,
  NEXT_PUBLIC_BOOKING_URL: optionalUrl,

  CRON_SECRET: optionalSecret,
  IP_HASH_SALT: optionalSecret,

  SENTRY_DSN: optionalUrl,
});

type RawEnv = z.infer<typeof schema>;
type Key = keyof RawEnv;

const REQUIRED_WHEN_LIVE = [
  'DATAFORSEO_LOGIN',
  'DATAFORSEO_PASSWORD',
  'SEMRUSH_API_KEY',
  'GOOGLE_API_KEY',
  'NEXT_PUBLIC_BOOKING_URL',
] as const satisfies readonly Key[];

const REQUIRED_WHEN_DEPLOYED = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'BLOB_READ_WRITE_TOKEN',
  'CRON_SECRET',
  'IP_HASH_SALT',
] as const satisfies readonly Key[];

const REQUIRED_IN_PRODUCTION = ['APP_BASE_URL', 'SENTRY_DSN'] as const satisfies readonly Key[];

function resolveProviders(raw: RawEnv): 'live' | 'fixtures' {
  return raw.AUDIT_PROVIDERS ?? (raw.VERCEL_ENV === 'production' ? 'live' : 'fixtures');
}

function resolveBaseUrl(raw: RawEnv): string {
  if (raw.APP_BASE_URL !== undefined) return raw.APP_BASE_URL.replace(/\/$/, '');
  if (raw.VERCEL_URL !== undefined) return `https://${raw.VERCEL_URL}${BASE_PATH}`;
  return `http://localhost:4100${BASE_PATH}`;
}

const envSchema = schema
  .superRefine((raw, ctx) => {
    const requireAll = (keys: readonly Key[], when: string) => {
      for (const key of keys) {
        if (raw[key] === undefined) {
          ctx.addIssue({ code: 'custom', path: [key], message: `required ${when}` });
        }
      }
    };

    const providers = resolveProviders(raw);
    const deployed = raw.VERCEL_ENV === 'preview' || raw.VERCEL_ENV === 'production';

    if (raw.VERCEL_ENV === 'production' && providers === 'fixtures') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUDIT_PROVIDERS'],
        message: 'fixtures is not allowed in Production',
      });
    }
    if (providers === 'live') requireAll(REQUIRED_WHEN_LIVE, 'when AUDIT_PROVIDERS=live');
    if (deployed) requireAll(REQUIRED_WHEN_DEPLOYED, 'on Vercel deployments');
    if (raw.VERCEL_ENV === 'production') requireAll(REQUIRED_IN_PRODUCTION, 'in Production');
  })
  .transform((raw) => ({
    ...raw,
    AUDIT_PROVIDERS: resolveProviders(raw),
    APP_BASE_URL: resolveBaseUrl(raw),
  }));

export type Env = z.infer<typeof envSchema>;

/** Parses an environment, treating empty values as unset; throws one error listing every problem. */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const present = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const result = envSchema.safeParse(present);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  - ${issue.path.map(String).join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment (see .env.example):\n${problems.join('\n')}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
