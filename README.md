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

Important: this is still not a finished Uber-scale production system. It is a stronger developer handoff package.

## Backend quick start

1. Copy `.env.example` to `.env`.
2. Install dependencies: `npm install`
3. Build TypeScript: `npm run build`
4. Start API: `npm start`
5. Run core backend tests: `npm test`

## Current backend bootstrap additions

- Centralized runtime environment loading and defaults in `env.ts`
- Data store bootstrap supports:
  - `DATA_STORE_MODE=memory` for scaffold/development
  - `DATA_STORE_MODE=file` for lightweight persisted JSON state
- Core route tests in `core.routes.test.ts` cover `/health` and auth signup flow
