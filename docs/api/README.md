# Backend API Documentation

## Base URL
- Local: `http://localhost:8080`
- Base path: `/api/*`

## OpenAPI/Swagger
- Source: `docs/api/openapi.yaml`
- Endpoints and schemas are listed for every registered route under `src/routes`.

## Authentication
- Scheme: JWT bearer token.
- Header: `Authorization: ******
- Token endpoints:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`

## Error responses
Standard shape:
```json
{ "error": "message" }
```
Common codes: `400`, `401`, `403`, `404`, `429`, `500`.

## Rate limiting
- Middleware: `express-rate-limit`
- Current global policy: 300 requests per 60 seconds per client.

## Pagination
List endpoints should accept/passthrough pagination keys where applicable:
- `page`, `limit`
- Optional `cursor` for cursor-based list flows

## Filtering and sorting
List/search endpoints support filter objects and optional sorting fields:
- `sortBy`
- `sortOrder` (`asc` / `desc`)

## Request/response schemas
- Canonical schemas are in OpenAPI components and route-level Zod schema modules in `src/schemas`.

## Endpoint examples
- Catalog: `docs/api/endpoints.md`
- cURL/JavaScript/Python examples: `docs/api/usage-examples.md`

## Webhooks
- Payment webhook docs: `docs/api/webhooks.md`
