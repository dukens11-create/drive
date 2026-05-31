# ADR-002: JWT + role middleware authorization

## Decision
Use `requireAuth` and `requireRole` middleware for endpoint access control.

## Trade-offs
- Pros: centralized auth checks and consistent role enforcement.
- Cons: route-level discipline required to avoid unguarded handlers.

## Alternatives considered
- API gateway-only authz, policy engine.
