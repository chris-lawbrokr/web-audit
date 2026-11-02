import 'server-only';

import type { ReportPayload } from '@/shared/audit/contracts';

import { env } from '../config/env';

/** Lawbrokr's scheduler link, used when NEXT_PUBLIC_BOOKING_URL is unset (it is required in Production). */
const DEFAULT_BOOKING_URL =
  'https://meetings.hubspot.com/jgutmann/discovery-call-website?uuid=c4373772-c271-4e0d-b28c-8020dbac4b26';

/** "Book a walkthrough", with the visitor's name and email added so the scheduler can prefill them. */
export function bookingUrlFor(lead: ReportPayload['lead']): string {
  const url = new URL(env.NEXT_PUBLIC_BOOKING_URL ?? DEFAULT_BOOKING_URL);
  for (const [key, value] of Object.entries(lead)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}
