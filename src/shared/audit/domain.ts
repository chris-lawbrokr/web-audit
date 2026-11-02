/**
 * Whatever was typed into the URL field, reduced to the bare domain the report is titled with:
 * `https://www.SmithLaw.com/contact?ref=x` → `smithlaw.com`.
 */
export function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#:].*$/, '')
    .toLowerCase();
}

/** At least one dot, and only letters, digits and hyphens between them. */
const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export const isValidDomain = (domain: string) =>
  domain.length <= 253 && DOMAIN_PATTERN.test(domain);
