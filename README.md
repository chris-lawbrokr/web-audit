# Lawbrokr marketing web audit

The free website audit for law firms, served at `lawbrokr.com/audit`. One Next.js (App Router) app holds
the pages, the API, the scan pipeline and the PDF renderer. The scope documents `01`–`07`, kept outside
this repository, describe the whole build.

**Status:** runs locally on **real data only**. The whole journey works (Start → Scan →
Gate → Report), and every number in a report comes from DataForSEO, Semrush or Google PageSpeed
Insights during that audit. There is no sample-data mode: a check with no data says so and isn't
scored. See [Not built yet](#not-built-yet) for what deploying needs.

## Run it

Requires Node 26 (24 works too; Vercel runs 24) and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # then fill in the four provider keys; the app won't start without them
pnpm dev                     # http://localhost:4100/audit
```

| Command          | Does                                         |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Development server                           |
| `pnpm build`     | Production build                             |
| `pnpm start`     | Serve the production build                   |
| `pnpm typecheck` | Generate route types, then `tsc` (strictest) |
| `pnpm format`    | Prettier                                     |
| `pnpm check`     | Type check and format check                  |

Health check: `GET /audit/api/health` → `{ "status": "ok" }`.

## Try it

1. Open http://localhost:4100/audit and enter a law firm's website, like `dolmanlaw.com`.
2. The scan takes 30 seconds to 2½ minutes; Google's phone speed test is usually the slowest part.
3. Fill in the form (name and email are required) to unlock the report.
4. On the report, "Download PDF" opens the print dialog, and "Book a walkthrough" opens the booking link.

**Every audit spends money:** about $0.10 of DataForSEO credit and 40 Semrush units (PageSpeed
Insights is free). The terminal logs each audit's cost as an `[audit]` line, any provider failure as an
`[audit] … failed` line, and each submitted lead as a `[lead]` line.

Everything is kept in memory, so restarting the server forgets every audit and report; old links then
show "We couldn't find that audit."

## How it fits together

| Where                                | What                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `src/app/page.tsx`                   | Start page                                                                |
| `src/app/scan/[auditId]/page.tsx`    | Scan, then the gate (`src/features/scan`, `src/features/gate`)            |
| `src/app/report/[reportId]/page.tsx` | Report (`src/features/report`)                                            |
| `src/app/api/audits/…`               | The API: start an audit, poll it, unlock (`04-backend.md` §6)             |
| `src/server/audit/pipeline.ts`       | The scan: runs each check against the providers, in the background        |
| `src/server/providers/`              | One adapter each: DataForSEO, Semrush, PageSpeed Insights                 |
| `src/server/crawl/`                  | Reading the firm's homepage, with public addresses only (`safe-fetch.ts`) |
| `src/server/audit/scoring.ts`        | Scores, bands, fixes and "Fix these first", from measured results only    |
| `src/server/audit/store.ts`          | The in-memory store: where Postgres plugs in                              |
| `src/shared/audit/`                  | Checks, validation and the API's types, shared by browser and server      |

The lock from the spec holds: nothing the browser receives before the unlock contains a score, band or
comparison. The gate's blurred preview shows the report's outline with no numbers in it.

### What each check measures

| Check                | Source                                                                                                                                                           | When there's no data                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Google reviews       | Google Maps via DataForSEO: the firm's listing (found by its website, then its name), and the 3 nearest law firms Google lists for its practice area in 10 miles | No listing found: not scored                             |
| Load speed           | PageSpeed Insights: Chrome's real visitors (75th percentile) when Google has them, otherwise the Lighthouse lab test; both shown, labeled                        | Google returns no result: not scored                     |
| Search traffic       | Semrush: estimated monthly visits from Google search, for the firm and its competitors                                                                           | Semrush has no data (common for small sites): not scored |
| SEO & GEO visibility | 4 local Google searches (top 10 and the map pack), Google AI Overviews, and 2 questions each to ChatGPT and Perplexity, via DataForSEO                           | Location unknown: not scored                             |

The overall score needs at least three measured checks. Bounce rate is gone: nothing the audit can
reach measures it (Semrush's Trends API would). The practice area comes from the firm's Google category,
then its homepage text, by keyword rules.

## Environment

[`.env.example`](.env.example) lists every variable and where to get it. The server validates them at
boot ([`src/server/config/env.ts`](src/server/config/env.ts)). If anything is missing or malformed, it
logs every problem at once and answers each request with an error until it's fixed.

Which variables are required depends on where the app runs:

| Where                         | Required                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Everywhere                    | DataForSEO, Semrush and Google keys                                            |
| Vercel Preview and Production | Also database, Blob, `CRON_SECRET`, `IP_HASH_SALT`                             |
| Production                    | All of the above, plus `APP_BASE_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_BOOKING_URL` |

The services that issue keys:

| Service      | Variables                                 | Cost                                                                          |
| ------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| DataForSEO   | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | Pay as you go, $50 minimum top-up                                             |
| Semrush      | `SEMRUSH_API_KEY`                         | Prepaid API units (Lawbrokr's key: 100,000; no Trends API, so no bounce rate) |
| Google Cloud | `GOOGLE_API_KEY` (PageSpeed Insights API) | Free                                                                          |
| Sentry       | `SENTRY_DSN`                              | Free tier possible                                                            |

Who provides each account, and where each one stands, is in the scope document
`05-data-sources-and-integrations.md`, §10.

Neon and Vercel Blob fill in their own variables when connected to the Vercel project. Vercel BotID needs
no key. `CRON_SECRET` and `IP_HASH_SALT` are random strings: `openssl rand -hex 32`.

**v1 has no HubSpot and no email.** Leads are stored in Postgres only, and the visitor gets the report page
and the PDF but no emailed copy. "Book a walkthrough" is a plain link (`NEXT_PUBLIC_BOOKING_URL`), which
can stay a HubSpot meetings page without any HubSpot integration.

Compared with the list in `04-backend.md` §11, the template is trimmed to what v1 uses:

- **Added:** `APP_BASE_URL`, for absolute links in the PDF and to the report.
- **Renamed:** `NEXT_PUBLIC_HUBSPOT_MEETINGS_URL` is `NEXT_PUBLIC_BOOKING_URL`.
- **Merged:** one `SENTRY_DSN` serves the server and the browser (the Sentry setup exposes it).
- **Removed for v1:** all HubSpot and email variables.
- **Removed:** `AUDIT_PROVIDERS`. There is no sample-data mode, so nothing to switch.
- **Renamed:** `SIMILARWEB_API_KEY` is `SEMRUSH_API_KEY`; Semrush replaced Similarweb on 2026-11-02.
- **Left out until chosen:** Google Places, Cloudflare Turnstile, Upstash, `CHROMIUM_PACK_URL`
  and the Sentry source-map token. Add each one back to `.env.example` and `env.ts` together when its
  feature is picked.

## Not built yet

- **Storage.** The in-memory store doesn't survive a restart and can't work on Vercel. It needs Postgres
  (Drizzle + Neon), which also keeps the leads.
- **A way for sales to see leads.** For now they only appear in the server's terminal.
- **A server-generated PDF.** "Download PDF" is the browser's print-to-PDF, as in the mock.
- **Protection.** Bot protection, rate limits and the daily spend ceiling. Real providers cost money on
  every audit, so this has to exist before the app is reachable by anyone else.
- **Caching.** Re-auditing a domain within 24 hours runs (and pays for) everything again.
- **The scan on Vercel.** It runs in-process after the response (`after()`), which works on a
  long-lived local server. On Vercel it moves to Vercel Workflows.
- **Pinned addresses in the crawler.** `safe-fetch.ts` checks that a host resolves to public addresses,
  but fetch resolves it again, so DNS rebinding could slip through. Fine on a developer's machine; fix
  before deploying.
- **Tests.** The scoring, the matching rules and the provider parsers have no automated tests yet.
- **The rest of the quality gate** from the scope's `starter-config/` (ESLint, knip, jscpd, dependency-cruiser,
  Vitest, Playwright with axe, lefthook, commitlint, CI, Renovate), Sentry, and the
  Content-Security-Policy.

```bash
https://www.ballmorselowe.com/
https://ganttfamilylaw.com/
https://www.dklawmd.com/
https://www.military-defenseattorney.com/
https://lawyersforjustice.com/
https://kkoslawyers.com/
https://illuminelegal.com/
https://www.feplg.com/
https://www.fighterlaw.com/
https://www.marcjacobesq.com/
https://www.conveyance.law/
https://galelaw.ca/
http://www.bbb-lawfirm.com/
https://stalwartlaw.com/
```
