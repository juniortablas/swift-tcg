# Sentry

Production error monitoring for the Swift TCG storefront. Observability only — no UI, checkout, or commerce behavior changes.

SDK: official [`@sentry/nextjs`](https://docs.sentry.io/platforms/javascript/guides/nextjs/) (v10).

## What is captured

| Surface | How |
| --- | --- |
| Client exceptions | `instrumentation-client.ts` |
| Server / Route Handler / Server Component exceptions | `instrumentation.ts` → `onRequestError` |
| Edge / `proxy.ts` | `sentry.edge.config.ts` |
| React error boundaries | `app/error.tsx`, `app/global-error.tsx`, `app/account/error.tsx` |
| Handled API 5xx | `captureRouteException` in route `catch` blocks |
| Webhooks | `/api/webhooks/cache`, `/api/webhooks/reviews` |
| Cron | `/api/cron/back-in-stock` (handled) + `/api/cron/reviews` (unhandled → `onRequestError`) |
| Session Replay | Client only, privacy defaults on |
| Tracing | Conservative sample rates (see below) |

Expected 4xx (auth, validation, mixed-cart) are **not** reported.

## Installation

The SDK is already a dependency. No extra install is required on a fresh clone:

```bash
npm install
```

Official config files (do not replace with deprecated `sentry.client.config.ts`):

| File | Runtime |
| --- | --- |
| `instrumentation-client.ts` | Browser |
| `sentry.server.config.ts` | Node.js |
| `sentry.edge.config.ts` | Edge / proxy |
| `instrumentation.ts` | Registers server + edge; exports `onRequestError` |
| `next.config.ts` | `withSentryConfig` (source maps, tunnel, cron monitors) |

Sentry initializes **only when a DSN is set**. Local development works with all Sentry variables unset.

## Environment variables

Set these in Vercel (Production + Preview) and optionally in `.env.local`.

### Required to send events

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Client + server | Public DSN. Required for browser events. |
| `SENTRY_DSN` | Server / edge | Optional fallback if the public DSN is unset on the server. |

Use the same DSN value for both. If neither is set, Sentry is a no-op.

`NEXT_PUBLIC_SENTRY_DSN` is inlined at **build** time (same as GA). Set it on Vercel before the production/preview build, not only as a runtime variable.

### Required to upload source maps (production builds)

| Variable | Purpose |
| --- | --- |
| `SENTRY_AUTH_TOKEN` | Auth token with `project:releases` / `org:read` (CI/Vercel **build** env). Never expose to the browser. |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project slug |

Without the auth token, `next build` still succeeds. Source maps are not uploaded, and stack traces stay minified.

### Optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `VERCEL_ENV` or `NODE_ENV` | `development` \| `preview` \| `production` |
| `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` | `swift-tcg@0.1.0+<git sha>` | Override release name |
| `SENTRY_TRACES_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `1` dev, `0.2` preview, `0.1` production | Tracing sample rate `0–1` |
| `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | `0.05` | Replay for normal sessions |
| `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | `1` | Replay when an error occurs |

Vercel already injects `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, and (when system env vars are exposed) `NEXT_PUBLIC_VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Those drive environment + release automatically.

## How to disable

Unset `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`, then redeploy / restart.

- No SDK init
- No events
- No tunnel traffic
- Source map upload is skipped when `SENTRY_AUTH_TOKEN` is also unset

Leaving Replay/tracing vars set without a DSN has no effect.

## Privacy

`beforeSend` sanitization plus `dataCollection` opt-outs. Events never include:

- Shopify access / storefront / private tokens (`shpat_`, …)
- Customer access, refresh, or ID tokens (JWTs redacted)
- Cookies and `Authorization` headers
- Passwords and payment fields
- Cron / webhook secrets

Logged-in user context is limited to:

- Customer ID (`sub` from the ID token — not a session token)
- SHA-256 hash of email (never the raw address)

Session Replay uses Sentry privacy defaults: all text, inputs, and media are masked/blocked.

## Releases

Each production/preview build is a Sentry release:

```
swift-tcg@<package version>+<git commit sha>
```

Events include environment (`development` / `preview` / `production`) and that release id.

## Source maps

`withSentryConfig` uploads maps during production builds when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set.

Client maps are deleted after upload (`sourcemaps.deleteSourcemapsAfterUpload`, the official default). They are not served publicly. Do not set deprecated `hideSourceMaps`.

## Performance and Replay

| Signal | Development | Preview | Production |
| --- | --- | --- | --- |
| Traces | 100% | 20% | 10% |
| Replay (errors) | 100% | 100% | 100% |
| Replay (sessions) | 5% | 5% | 5% |

Override with the sample-rate env vars above. Client events are tunneled through `/monitoring` so ad blockers are less likely to drop them. That path is excluded from `proxy.ts` and maintenance mode.

## Alerts (Sentry project)

Configure in Sentry → Alerts after the first production events. Recommended:

1. **New issue** — notify immediately (Slack / email)
2. **Issue frequency** — spike vs baseline
3. **Cron monitor** — `/api/cron/back-in-stock` and `/api/cron/reviews` (enabled via `_experimental.vercelCronsMonitoring`)

Every error event should include URL, browser, OS, device, release, stack trace, breadcrumbs (including `console.error` and failed network calls). Those come from the SDK defaults; no extra UI widget is installed.

## How to verify events are received

1. Set `NEXT_PUBLIC_SENTRY_DSN` (and `SENTRY_DSN`) in `.env.local` or Vercel.
2. Restart `npm run dev` or deploy.
3. Trigger a real exception (browser console `throw` is **sandboxed** and will **not** appear in Sentry).

Temporary client check — add to any existing client component, click it, then remove:

```tsx
<button type="button" onClick={() => { throw new Error("Sentry client test") }}>
  Sentry test
</button>
```

Temporary server check — throw inside a Route Handler, hit it, then remove:

```ts
throw new Error("Sentry server test")
```

4. Open Sentry → **Issues**. You should see the test error with a stack trace, release, and environment.
5. Open **Replays** after an error (100% on error).
6. Open **Traces** after navigating a few pages (sampled).

Do not leave test throws in the storefront.

## How to test locally without Sentry

Leave DSN vars unset. `npm run dev` and `npm run build` must succeed. The SDK must not send traffic.

## Deployment checklist

- [ ] Create a Sentry project (platform: Next.js)
- [ ] Copy the DSN into Vercel **Production** and **Preview**: `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`
- [ ] Create a Sentry auth token (Organization → Auth Tokens) with source map upload scopes
- [ ] Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel **Build** environment (Production + Preview)
- [ ] Confirm Vercel “Automatically expose System Environment Variables” is on (commit SHA + `VERCEL_ENV`)
- [ ] Deploy and confirm the Vercel build log mentions source map upload (or a skip warning if the token is missing — build must still pass)
- [ ] Trigger a test error on preview, confirm the issue in Sentry, delete the test
- [ ] Configure alert rules (new issues + cron monitors)
- [ ] Confirm `/monitoring` is reachable while `MAINTENANCE_MODE=true` (tunnel bypass)
- [ ] Do not commit `.env.sentry-build-plugin` or any auth token

## Runtime overhead (estimate)

| Area | Cost |
| --- | --- |
| Client JS (errors + tracing) | ~30–45 KB gzipped |
| Session Replay (lazy, sampled) | ~40–60 KB gzipped additional when a session is recorded |
| Tracing | ~10% of production requests (spans); 100% in development |
| Tunnel `/monitoring` | Extra same-origin POST per client event; avoids ad-block loss |
| Server | Negligible per request when no error; `beforeSend` only on captured events |
| Build | Source map upload adds ~10–40s on CI when the auth token is set |

Replay is the largest client cost and only loads for sampled sessions.

## Remaining recommendations

- Connect the GitHub repo in Sentry (suspect commits + Seer).
- After a week of production traffic, lower `tracesSampleRate` if span quota is high.
- Add a Slack workspace alert for `production` only; keep preview quieter.
- Do not enable User Feedback / the Sentry overlay — it would change UI.
- Rotate `SENTRY_AUTH_TOKEN` if it ever lands in a client bundle or git history.
