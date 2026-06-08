# Security Documentation

## Security guidelines
- Protect JWT and admin credentials via secret stores.
- Enforce HTTPS/TLS for all non-local traffic.
- Validate and sanitize all request input with schemas.
- Apply least-privilege role checks for admin/driver/rider endpoints.

## Best practices
- Run `npm audit --audit-level=high` in CI.
- Run CodeQL on pull requests, and keep repository dependency graph enabled so dependency review can run on pull requests.
- Rotate secrets periodically and after incidents.
- Avoid storing sensitive card data in app databases.

## Compliance references
- GDPR: data minimization, retention windows, user deletion workflows.
- Privacy policy and terms templates: `PRIVACY_TEMPLATE.md`, `TERMS_TEMPLATE.md`.
- Data retention: define operational and legal retention periods per domain.
