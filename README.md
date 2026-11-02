# Lawbrokr marketing web audit

The free website audit for law firms, served at `lawbrokr.com/audit`. One Next.js (App Router) app holds
the pages, the API, the scan pipeline and the PDF renderer. The scope documents `01`–`07`, kept outside
this repository, describe the whole build.

**Status:** a minimal working version on **sample data**. The whole journey runs locally (Start → Scan
with the quiz → Gate → Report), but every number is made up from the domain name until the real data
sources are connected. See [Not built yet](#not-built-yet).

## Run it

Requires Node 26 (24 works too; Vercel runs 24) and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # optional: nothing in it is needed locally
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

1. Open http://localhost:4100/audit and enter any website, like `smithinjurylaw.com`.
2. The scan takes about 15 seconds. Answer the quiz while it runs: your guess and goal change the
   report.
3. Fill in the form (name and email are required) to unlock the report.
4. On the report, "Download PDF" opens the print dialog, and "Book a walkthrough" opens the booking link.

The same site always gets the same sample numbers, and different sites get different ones.
`smithinjurylaw.com` gets exactly the mock's numbers, so the two can be compared side by side. Each
submitted lead is printed in the terminal running the server, as a `[lead]` line.

Everything is kept in memory, so restarting the server forgets every audit and report; old links then
show "We couldn't find that audit."

## How it fits together

| Where                                | What                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `src/app/page.tsx`                   | Start page                                                                       |
| `src/app/scan/[auditId]/page.tsx`    | Scan, then the gate (`src/features/scan`, `src/features/gate`)                   |
| `src/app/report/[reportId]/page.tsx` | Report (`src/features/report`)                                                   |
| `src/app/api/audits/…`               | The API: start an audit, poll it, save quiz answers, unlock (`04-backend.md` §6) |
| `src/server/audit/fixtures.ts`       | The sample data: where the real providers plug in                                |
| `src/server/audit/scoring.ts`        | Scores, bands, fixes and "Fix these first", as in the mock                       |
| `src/server/audit/store.ts`          | The in-memory store: where Postgres plugs in                                     |
| `src/shared/audit/`                  | Checks, quiz, validation and the API's types, shared by browser and server       |

The lock from the spec holds: nothing the browser receives before the unlock contains a score, band or
comparison. The gate's blurred preview uses placeholder numbers.

## Environment

[`.env.example`](.env.example) lists every variable and where to get it. The server validates them at
boot ([`src/server/config/env.ts`](src/server/config/env.ts)). If anything is missing or malformed, it
logs every problem at once and answers each request with an error until it's fixed.

Which variables are required depends on where the app runs:

| Where                                | Required                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| Local, `AUDIT_PROVIDERS` blank       | Nothing                                                             |
| Anywhere with `AUDIT_PROVIDERS=live` | DataForSEO, Semrush, Google, the booking link                       |
| Vercel Preview and Production        | Database, Blob, `CRON_SECRET`, `IP_HASH_SALT`                       |
| Production                           | All of the above, plus `APP_BASE_URL` and `SENTRY_DSN`; always live |

The services that issue keys:

| Service      | Variables                                 | Cost                                                                          |
| ------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| DataForSEO   | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | Pay as you go, $50 minimum top-up                                             |
| Semrush      | `SEMRUSH_API_KEY`                         | Prepaid API units (Lawbrokr's key: 100,000; no Trends API, so no bounce rate) |
| Google Cloud | `GOOGLE_API_KEY`                          | Free                                                                          |
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
- **Renamed:** `SIMILARWEB_API_KEY` is `SEMRUSH_API_KEY`; Semrush replaced Similarweb on 2026-11-02.
- **Left out until chosen:** Google Places, Cloudflare Turnstile, Upstash, `CHROMIUM_PACK_URL`
  and the Sentry source-map token. Add each one back to `.env.example` and `env.ts` together when its
  feature is picked.

## Not built yet

- **Real data.** `src/server/audit/fixtures.ts` makes up the numbers; the DataForSEO, Semrush,
  PageSpeed Insights and CrUX adapters, the site crawl and firm identification replace it. With
  `AUDIT_PROVIDERS=live`, starting an audit returns an error saying real data isn't connected.
- **Storage.** The in-memory store doesn't survive a restart and can't work on Vercel. It needs Postgres
  (Drizzle + Neon), which also keeps the leads.
- **A way for sales to see leads.** For now they only appear in the server's terminal.
- **A server-generated PDF.** "Download PDF" is the browser's print-to-PDF, as in the mock.
- **Protection.** Bot protection, rate limits and the daily spend ceiling, all needed before real
  providers cost money.
- **The scan pipeline.** Vercel Workflows, which replaces the clock-based sample scan.
- **The rest of the quality gate** from the scope's `starter-config/` (ESLint, knip, jscpd, dependency-cruiser,
  Vitest, Playwright with axe, lefthook, commitlint, CI, Renovate), Sentry, and the
  Content-Security-Policy.
- **Fonts via `next/font`.** The page links Google's font stylesheet as the mock does, because the font
  tokens name the faces as Google serves them and `next/font` would rename them.
