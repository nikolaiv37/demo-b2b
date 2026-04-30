# Observability And Smoke Tests

Date: 2026-04-30

## Scope

This stage adds lightweight frontend observability and cheap static smoke checks without introducing browser automation.

## Frontend Sentry

Sentry is initialized only when `VITE_SENTRY_DSN` is set.

Initialization source:
- `src/lib/sentry.ts`
- called from `src/main.tsx`

Environment handling:
- `VITE_APP_ENV`
- falls back to `import.meta.env.MODE`

Optional release handling:
- `VITE_APP_VERSION`
- falls back to `undefined`

### What Sentry captures

- frontend runtime exceptions
- React error boundary exceptions captured through the existing `react-error-boundary` path
- safe user context:
  - user id
  - tenant id
  - tenant slug
  - role

### What Sentry intentionally does not capture

- no Session Replay
- no manual request breadcrumbs
- no console breadcrumbs
- no DOM/input breadcrumbs
- no form text values
- no passwords
- no invite tokens
- no CSV contents or import rows
- no raw customer, order, or product payloads added by this integration

Additional guardrails:
- `sendDefaultPii` stays disabled
- request headers/cookies/body are removed in `beforeSend`
- sensitive URL query params and auth hashes are redacted before events are sent

## Required env vars

Add these locally or in Vercel project settings:

- `VITE_SENTRY_DSN`
- `VITE_APP_ENV`
- `VITE_APP_VERSION`

Example local values:

```bash
VITE_APP_ENV=development
VITE_APP_VERSION=local-dev
```

Do not commit a real DSN into repo files.

## Local testing

1. Add `VITE_SENTRY_DSN` to your local `.env` or `.env.local`.
2. Start the app normally.
3. Trigger a controlled frontend error in development if you want to confirm event delivery.
4. Verify the event appears in Sentry with:
   - environment
   - release if set
   - user id / tenant id / tenant slug / role tags

If `VITE_SENTRY_DSN` is missing, the app should run normally with no Sentry initialization noise.

## Vercel env setup

In Vercel:

1. Open the project.
2. Go to `Settings`.
3. Open `Environment Variables`.
4. Add:
   - `VITE_SENTRY_DSN`
   - `VITE_APP_ENV`
   - `VITE_APP_VERSION`
5. Apply them to the environments you need:
   - `Production`
   - `Preview`
   - optionally `Development`
6. Redeploy after changing env vars so the frontend build picks them up.

Suggested values:

- Production:
  - `VITE_APP_ENV=production`
- Preview:
  - `VITE_APP_ENV=preview`
- Version:
  - set a release string that matches your deployment or git versioning approach

## Smoke test commands

Available commands:

```bash
npm run smoke
npm run verify
```

`npm run smoke` currently checks:
- translation key presence for critical UI files:
  - login
  - sidebar
  - orders
  - clients
  - settings
  - CSV import
- feature-flag expectations for hidden demo items
- static sidebar gating expectations for admin-only items

`npm run verify` runs:

```bash
npm run build
npm run smoke
```

## Still manual QA

Static smoke checks do not replace manual validation.

Still manual:
- confirm a real Sentry event lands in the intended Sentry project
- verify environment and release tagging on a real deployment
- verify the app still behaves correctly across admin and company sessions
- verify no sensitive data appears in a real Sentry event
- continue route-level demo QA without enabling browser automation
