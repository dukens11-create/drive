# Developer Guide

## Getting started
1. Install Node 20+ and npm.
2. Clone repository and run `npm ci`.
3. Configure `.env` from `.env.example`.
4. Start backend: `npm run dev`.
5. First API call: `GET /health`.

## Sandbox environment
- Run locally with non-production credentials and test accounts.
- Use Postman environment: `docs/api/postman/Drive.postman_environment.json`.
- Use test cards and webhook replay for payment workflows.

## Project structure
- `src/` backend API
- `admin/` admin dashboard
- `web/` passenger web
- `mobile/` driver mobile app
- `mobile-passenger/` passenger mobile app

## Authentication guide
- Generate API credentials through admin tools where applicable.
- Use `POST /api/auth/login` to obtain access/refresh tokens.
- Refresh with `/api/auth/refresh`; revoke with `/api/auth/logout`.
- Store credentials in environment variables or secure vaults.
- Never commit API keys or bearer tokens.

## SDK guidance
The platform is HTTP/JSON-first. SDK wrappers should follow the same contract:
- JavaScript/Node.js
- Python
- Java
- Go
- Ruby
- PHP

Recommended SDK baseline:
- constructor with `baseUrl` + `accessToken`
- request middleware for retry/backoff + request IDs
- typed methods for `rides`, `orders`, `payments`, `support`, and `webhooks`

## Code examples
Reference implementations and snippets:
- Authentication: `docs/api/usage-examples.md#authentication`
- Ride creation: request flow in `docs/api/endpoints.md` (`/api/rides/request`)
- Order placement: merchant and marketplace routes in endpoint catalog
- Payment processing and webhooks: `docs/api/webhooks.md`
- Error handling: status-code mapping in `docs/api/README.md#error-model-and-status-codes`

## Testing and debugging
- Full validation commands: `docs/testing.md`
- Troubleshooting and common issues: `docs/troubleshooting.md`
- Add request correlation (`X-Request-Id`) when debugging distributed flows.
- Use `npm run build` and focused tests before opening a PR.

## Code style
- TypeScript-first, explicit types for public APIs.
- Keep schemas in `src/schemas`, handlers in `src/controllers`, domain logic in `src/services`.
- Validate input with Zod before service execution.

## Development workflow
- Branch naming: `feature/<scope>`, `fix/<scope>`, `docs/<scope>`.
- Commit format: imperative and scoped.
- PR checklist: tests, security, docs, rollback notes.
