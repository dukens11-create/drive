# FlupFlap Production Incident Response Runbook

Status: operational draft. Review with the production operator before launch.

## Severity
- SEV-1: safety incident, unauthorized data exposure, widespread inability to request/complete trips, incorrect charges/payouts, or destructive data loss.
- SEV-2: major feature unavailable with a workaround, elevated payment/provider failures, delayed dispatch, or degraded restaurant ordering.
- SEV-3: limited degradation, isolated UI defects, non-critical provider delay.

## First 15 minutes
1. Assign an incident commander.
2. Record UTC start time and affected surface: Rider, Driver, Eat, Admin, payments, database, notifications, or provider.
3. If physical safety can be affected, prioritize emergency/safety procedures over service restoration.
4. Check `/health` and `/readyz`, deployment logs, database health, Stripe webhook health, and current error rate.
5. Freeze deployments for SEV-1/SEV-2.
6. If payments are inconsistent, stop new paid dispatch rather than risk double charging.
7. If database integrity is uncertain, place the product in maintenance mode and preserve logs/backups before mutation.

## Containment
- Bad deploy: roll back to the last known-good immutable release.
- Provider outage: disable only the affected provider path if safe; never fabricate success.
- Payment webhook outage: keep provider event IDs and reconcile before manually changing payment state.
- Suspected credential leak: rotate the credential, revoke old keys/tokens, review access logs, and document the exposure window.
- Data corruption: stop writers, create a forensic database backup, then restore or repair from a tested point.

## Communications
- Maintain an internal incident timeline with who/what/when.
- Customer messages must describe observed impact and available safe workarounds without speculation.
- Never include access tokens, card data, government IDs, private addresses, or full phone numbers in incident chat/logs.

## Recovery validation
Before declaring recovery:
- `/readyz` returns 200.
- Rider can estimate and create a test ride without fake driver data.
- Driver can receive the request and move through accept → arrive → start → complete.
- Payment webhook/reconciliation is healthy.
- No duplicate driver payout transfer is created.
- Database restart persistence is verified.
- Push/SMS/email are sampled if the incident involved notifications.

## Post-incident
Within two business days for SEV-1/SEV-2:
- write root cause and contributing factors;
- list customer/safety/data/payment impact;
- add a regression test or monitor;
- record remediation owner and due date;
- conduct a restore/rollback drill if the incident exposed a gap.