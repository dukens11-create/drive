# FlupFlap Ride V7 — Expanded Build-Ready Scaffold

This V7 package adds more missing developer pieces for a ride-share, food delivery, courier, and FlupFlap Marketplace same-day delivery platform.

V7 includes:
- TypeScript backend architecture
- Zod validation schemas
- Auth templates
- Webhook templates
- Dispatch engine design
- Background jobs
- Wallet ledger templates
- Driver onboarding workflow
- Rider and driver Flutter screens
- Admin and merchant dashboard page stubs
- API documentation
- Security/compliance/operations docs
- QA and load-test templates

## Repository layout

- Backend API code lives at the repository root.
- Flutter mobile code lives in `mobile/`.
- Codemagic configuration lives in `codemagic.yaml` and changes into `mobile/` to build Android/iOS release artifacts. It keeps the committed Android/iOS platform files in version control and regenerates them with `flutter create .` if critical project files are missing.

Important: this is still not a finished Uber-scale production system. It is a stronger developer handoff package.

## Backend quick start

1. Copy `.env.example` to `.env`.
2. Install dependencies: `npm install`
3. Build TypeScript: `npm run build`
4. Start API: `npm start`
5. Run core backend tests: `npm test`

## Environment configuration

Required in production:
- `JWT_SECRET`
- `ADMIN_SEED_PASSWORD`

Optional with safe defaults:
- `NODE_ENV` (default `development`)
- `PORT` (default `8080`)
- `LOG_LEVEL` (default `info`; supported: `debug|info|warn|error`)
- `DATA_STORE_MODE` (default `memory`; use `file` for lightweight persistence)
- `DATA_STORE_FILE` (default `.data/store.json`)

Use `.env.example` as the baseline and override values per environment.

## Containerization

Build and run with Docker:

1. `docker build -t flupflap-ride .`
2. `docker run --rm -p 8080:8080 --env-file .env flupflap-ride`

The Docker image builds TypeScript and runs the compiled server from `dist/server.js`.

## CI foundation

A GitHub Actions workflow is available at `.github/workflows/ci.yml` and runs:
- dependency install (`npm ci`)
- TypeScript build (`npm run build`)
- backend tests (`node --test dist/*.test.js`)

## Current backend bootstrap additions

- Centralized runtime environment loading and defaults in `env.ts`
- Data store bootstrap supports:
  - `DATA_STORE_MODE=memory` for scaffold/development
  - `DATA_STORE_MODE=file` for lightweight persisted JSON state
- Core route tests in `core.routes.test.ts` cover `/health`, auth token lifecycle, and ride/driver core flow
- Operational probes include `/health`, `/livez`, and `/readyz`

## Rider experience completion scope (current PR)

Added in scope:
- Rider-facing ride history, ride detail, receipt, and notification retrieval endpoints that fit the existing backend route/service structure.
- Richer fare estimate responses with estimate ranges, currency, surge multiplier, and fare breakdown data for client-side trip previews.
- Rider cancellation validation tied to ride status plus cancellation receipt-oriented response data.
- Foundational rider ratings/reviews support with stored review text and driver rating rollups.
- Ride lifecycle timeline events that power rider-visible notifications without introducing a separate messaging subsystem yet.

Assumptions:
- Lightweight in-process notifications derived from persisted ride events are sufficient for this phase.
- Wallet-ledger settlement remains the receipt source of truth until a fuller payment-provider receipt flow is added.
- Single-process API runtime with lightweight local persistence (`DATA_STORE_MODE=file`) is still acceptable for this stage.

Out of scope:
- Push delivery infrastructure (APNS/FCM/email/SMS), unread-state sync, and user notification preferences.
- Production-grade surge pricing, taxes, tolls, promo codes, and multi-currency fare computation.
- Full invoice PDF generation, payment processor reconciliation, and dispute/refund operations depth.
