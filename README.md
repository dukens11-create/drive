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
- `SUPPORT_TICKET_RETENTION_DAYS` (default `365`)
- `FRAUD_SIGNAL_RETENTION_DAYS` (default `365`)
- `GOVERNANCE_REQUEST_RETENTION_DAYS` (default `730`)
- `FRAUD_REPEATED_REFUND_THRESHOLD` (default `3`)
- `BACKUP_EXPORT_DIR` (default `.data/backups`)
- `ANONYMIZED_EMAIL_DOMAIN` (default `redacted.local`)

Use `.env.example` as the baseline and override values per environment.

Production note: `JWT_SECRET` and `ADMIN_SEED_PASSWORD` must be supplied from a secret manager or deployment environment and may not use the development defaults.

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

## Phase 8 compliance and enterprise readiness foundations

Implemented:
- Actor-bound support access so riders can only view or mutate their own tickets, while sensitive ticket review remains limited to privileged roles.
- Governance request foundations for privacy-related ticket types (`account_deletion`, `data_export`) with admin/compliance review endpoints and audit logging.
- Account anonymization for approved deletion requests, including refresh-token revocation and auth checks that block suspended/deleted accounts.
- Basic fraud signaling for repeated refund-style support requests and admin risk views that now include both safety incidents and fraud signals.
- Fraud thresholds and anonymized email domains are configurable so operators can tune policy behavior without code changes.
- Retention sweep foundations for expired refresh tokens, aged closed tickets, and completed governance/fraud records.
- Backup/recovery planning hooks via runtime configuration and an admin/compliance backup-plan endpoint that assumes backup encryption is handled by external infrastructure.

Assumptions:
- Privacy requests are initiated through the existing support workflow rather than a new dedicated portal.
- `support` and `compliance` are provisioned operational roles, not self-service signup roles.
- File-backed persistence remains the realistic backup target for the current repository stage.

Out of scope:
- Formal GDPR/CCPA certification workflows, legal review automation, or real data-export packaging.
- Centralized KMS/secret-manager integrations, immutable audit storage, or multi-region disaster recovery automation.
- Real fraud-scoring models; this phase only adds review hooks and suspicious-activity signals.

Recommended later follow-ups:
- Add dedicated provisioning flows for support/compliance users and stronger session invalidation/versioning.
- Move governance requests, audit logs, and backups to durable external storage with encryption and restore drills.
- Expand fraud rules beyond support-ticket patterns into payment, ride, and device/network telemetry.

## Backend core completion scope (current PR)

Added in scope:
- Structured persistence-backed in-memory/file store models for users, driver profiles, rides, wallet transactions, and refresh token sessions.
- Auth hardening with JWT issuer/audience validation, refresh-token hashing, refresh-token rotation, and logout revocation.
- Ride/driver core flow improvements: rider-only request/cancel/rate, driver-only accept/start/complete, assignment checks, and driver availability transitions.
- Route-level validation and tests for auth and ride/driver lifecycle.

Assumptions:
- Single-process API runtime with lightweight local persistence (`DATA_STORE_MODE=file`) is acceptable for this stage.
- Driver availability and approval are the minimum required gates for ride acceptance.

Out of scope:
- Full relational database migrations/ORM and distributed locking.
- Payments provider integration, surge/advanced dispatch optimization, and full admin/support workflows.
- Production-grade observability, multi-region scaling, and mobile/frontend feature completion.
