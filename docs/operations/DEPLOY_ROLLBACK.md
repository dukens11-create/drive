# FlupFlap Deployment and Rollback Runbook

## Pre-deploy gate
- CI green for backend, Rider/Driver mobile, web, Admin, and Eat tests.
- `npm audit --omit=dev --audit-level=high` passes.
- `npm run prod:check` passes against production configuration.
- Database backup is recent and restore-tested.
- Migration is backward compatible with the currently running release.
- Secrets are injected by the deployment platform, never committed.

## Deploy
1. Deploy to staging.
2. Run `npm run smoke:prod -- https://staging-api.example`.
3. Perform one two-device ride test after changes to dispatch, GPS, payments, or notifications.
4. Deploy an immutable release identifier to production.
5. Run the production smoke test.
6. Watch errors, latency, Stripe webhooks, and ride completion for at least one normal operational cycle.

## Rollback
Roll back immediately for:
- data corruption;
- material duplicate/incorrect charges;
- broken ride completion;
- driver assignment to unauthorized drivers;
- authentication bypass;
- sustained 5xx spike with no safe quick fix.

Rollback application code first when schema is backward compatible. If a database rollback is necessary:
1. stop writers;
2. preserve the failed-state backup;
3. restore only from a known verified backup;
4. run integrity checks and smoke tests before reopening traffic.

Never “fix” production by deleting data manually without an audit record.