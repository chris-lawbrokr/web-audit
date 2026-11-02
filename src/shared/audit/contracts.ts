import { z } from 'zod';

import type { CheckKey } from './checks';
import { PRACTICE_AREAS } from './checks';
import { cleanDomain, isValidDomain } from './domain';
import { CLIENT_SOURCES, GOALS, GUESSES, REPLY_SPEEDS } from './quiz';

/*
 * What the browser and the API exchange, shared so both sides validate the same way. Request bodies
 * are zod schemas; responses are plain types the server builds.
 */

export const URL_INVALID = 'Enter your firm’s website, like smithlaw.com.';
export const NAME_REQUIRED = 'Enter your name.';
export const EMAIL_REQUIRED = 'Enter your work email.';
export const EMAIL_INVALID = 'Enter a valid email, like you@yourfirm.com.';
export const PHONE_INVALID = 'Enter a 10-digit phone number.';

/** Something@domain.tld: no spaces, one @, and a domain with a real TLD. */
const EMAIL_PATTERN = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

export const isValidEmail = (value: string) => value.length <= 254 && EMAIL_PATTERN.test(value);

/** Ten digits or more, however they're punctuated. */
export const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10;

export const createAuditRequest = z.object({
  url: z.string().transform(cleanDomain).refine(isValidDomain, { message: URL_INVALID }),
});

export const quizAnswers = z.object({
  guess: z.enum(GUESSES.map((guess) => guess.label)).optional(),
  goal: z.enum(GOALS).optional(),
  reply: z.enum(REPLY_SPEEDS).optional(),
  source: z.enum(CLIENT_SOURCES).optional(),
});

export type QuizAnswers = z.infer<typeof quizAnswers>;

export const unlockRequest = z.object({
  firstName: z.string().trim().min(1, NAME_REQUIRED).max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().refine(isValidEmail, { message: EMAIL_INVALID }),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => value === '' || isValidPhone(value), { message: PHONE_INVALID }),
  practiceArea: z.union([z.enum(PRACTICE_AREAS), z.literal('')]),
  wantsCall: z.boolean(),
});

export type UnlockRequest = z.infer<typeof unlockRequest>;

/** Every error the API returns has this shape. */
export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

/** Icon names for the scan's discoveries; the UI maps each to an icon. */
export type DiscoveryIcon =
  'map-pin' | 'users' | 'smartphone' | 'pointer' | 'trending-up' | 'sparkles';

/** A finding the scan reveals as it goes. Nothing here may give away a score. */
export interface Discovery {
  id: string;
  icon: DiscoveryIcon;
  title: string;
  detail: string;
  avatars?: readonly string[];
  chips?: readonly string[];
}

export type CheckStatus = 'queued' | 'running' | 'done';

/**
 * What the scan screen polls. Before unlock it carries no score, band, finding or comparison:
 * only progress, the discoveries and, once complete, how many things need fixing.
 */
export interface AuditSnapshot {
  domain: string;
  status: 'running' | 'complete';
  /** 0–100. */
  progress: number;
  checks: readonly { key: CheckKey; status: CheckStatus; subStep: string }[];
  discoveries: readonly Discovery[];
  pagesRead: number;
  answers: QuizAnswers;
  /** Only once complete: drives the gate's "We found N things" line. */
  findingsCount: number | null;
  /** Only once unlocked. */
  reportId: string | null;
}

export interface Band {
  label: 'Healthy' | 'Room to grow' | 'Needs attention';
  variant: 'success' | 'warning' | 'destructive';
}

/** One bar in a category's comparison chart. */
export interface ComparisonRow {
  label: string;
  value: string;
  /** Bar width, 2–100. */
  pct: number;
  /** The visitor's own firm, drawn in the stronger fill. */
  mine: boolean;
}

export interface CategoryReport {
  key: CheckKey;
  title: string;
  score: number;
  band: Band;
  /** The headline number, like "4.4" or "5.2s". */
  metric: string;
  metricLabel: string;
  rows: readonly ComparisonRow[];
  /** The full recommendation. */
  fix: string;
  /** The recommendation in a line, for "Fix these first". */
  short: string;
}

/** The unlocked report: one snapshot for the report page and its printed copy. */
export interface ReportPayload {
  domain: string;
  ranAt: string;
  competitorsCompared: number;
  goalPhrase: string | null;
  overall: number;
  band: Band;
  headline: string;
  guessFeedback: string;
  fixFirst: readonly CategoryReport[];
  categories: readonly CategoryReport[];
  lead: { firstName: string; lastName: string; email: string };
  sampleData: boolean;
}
