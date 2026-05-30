# Production Roadmap

## Implemented baseline components

- Backend API, driver mobile app, passenger mobile app, passenger web app, and admin dashboard exist in this repository.
- CI workflows run backend, driver mobile, passenger mobile, web, and admin validation on pull requests.

## Still missing for a complete ride-sharing platform

### 1) Production-grade core infrastructure

- [ ] Replace the in-memory/file `data.store.ts` implementation with a real database and migration strategy.
- [ ] Add durable queue/worker infrastructure for async jobs (payments reconciliation, notifications, fraud checks, compliance jobs).
- [ ] Add environment-specific infrastructure definitions (staging/production IaC), not only app/container workflows.

### 2) Real provider integrations (currently partial/mock)

- [ ] Implement a real KYC/background check provider integration (`kyc.provider.ts` is currently a placeholder that auto-approves).
- [ ] Expand payment provider coverage beyond the current Stripe-focused path and wallet fallback.
- [ ] Add full dispute/chargeback/refund lifecycle automation across providers.

### 3) Safety, fraud, and compliance hardening

- [ ] Complete fraud controls listed in `FRAUD_REVIEW.md` (velocity checks, device fingerprinting).
- [ ] Complete security checklist controls in `SECURITY_CHECKLIST.md` (MFA enforcement, key rotation operations).
- [ ] Finalize compliance readiness in `COMPLIANCE_MATRIX.md` (GDPR legal review and operational controls).

### 4) Product feature completeness gaps

- [ ] Replace driver-side mock dispatch generation in `mobile/src/context/DriveRealtimeContext.tsx` with fully live dispatch.
- [ ] Replace admin KPI trend mock series in `admin/app/page.tsx` with backend-driven analytics/reporting data.
- [ ] Complete launch and market-expansion execution playbooks (currently high-level placeholders only).

### 5) Operational readiness

- [ ] Add concrete runbooks for incident response, rollback drills, and on-call escalation.
- [ ] Add production monitoring/alerting integrations (metrics, traces, and paging) with documented SLOs/SLIs.
- [ ] Add regular load/performance test execution in CI/CD (not only a static load test plan document).
