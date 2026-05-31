# Backend API Documentation

## Base URL
- Local: `http://localhost:8080`
- Base path: `/api/*`

## REST API surface
- Full route catalog: `docs/api/endpoints.md`
- Per-endpoint request and response examples: `docs/api/usage-examples.md`
- API schema definition: `docs/api/openapi.yaml`

## Authentication methods
- **JWT bearer token** for authenticated calls.
- Header format: send a JWT in the `Authorization` header.
- Token lifecycle endpoints:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`

## Error model and status codes
Standard error shape:
```json
{ "error": "message" }
```
Common status codes:
- `400` invalid request body/query/params
- `401` missing or invalid token
- `403` authenticated but not authorized
- `404` resource not found
- `429` rate limit exceeded
- `500` unhandled internal error

## Rate limits
- Middleware: `express-rate-limit`
- Current global policy: 300 requests per 60 seconds per client
- Retry strategy: backoff and retry after short cooldown when receiving `429`

## Pagination
List-style endpoints support:
- `page` (1-based)
- `limit` (recommended max: 100)
- Optional `cursor` for cursor-based flows

## Filtering, sorting, and search
For list endpoints (`/history`, `/list-*`, `/markets`, `/alerts`, etc.):
- Filtering: endpoint-specific filter payload fields
- Sorting: `sortBy`, `sortOrder` (`asc` / `desc`)
- Search: keyword/ID filters where supported by service request schemas

## OpenAPI / Swagger usage
- Source of truth: `docs/api/openapi.yaml`
- Import into Swagger UI/Redoc for interactive docs and try-it-out behavior.
- Generate API clients with OpenAPI Generator (JavaScript, Python, Java, Go, Ruby, PHP).

## API versioning and compatibility
- Current major version: `v1` route conventions under `/api/*`
- Backward compatibility policy:
  - additive changes are preferred for existing contracts
  - breaking changes require release note callout and migration guidance
- Deprecation policy:
  - announce deprecation in changelog and release notes
  - provide migration window and replacement endpoint/field mappings

## Webhooks
- Payment webhook docs and payloads: `docs/api/webhooks.md`
- Security verification and idempotency expectations documented in webhook guide

## GraphQL API
- This repository currently exposes REST APIs only.
- No GraphQL schema, query, mutation, or subscription API is currently published.
