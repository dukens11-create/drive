# Design Patterns

## Authentication patterns
- JWT credential in `Authorization` header.
- Role guard via `requireRole(...)` middleware.

## Caching patterns
- Redis-backed queues and ephemeral cache opportunities for hot reads.
- Route-level throttling via `express-rate-limit`.

## Error handling patterns
- Centralized middleware in `src/middleware/error-handler.ts`.
- Consistent `{ "error": "..." }` responses.

## Logging patterns
- Structured logger in `src/utils/logger.ts`.
- Request failure metadata includes status/message.
