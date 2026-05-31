# Troubleshooting Guide

## Common issues
- API not responding: verify `PORT`, process logs, `/health`.
- Database/file-store issues: check `DATA_STORE_MODE` and file/volume permissions.
- Authentication failures: verify JWT secret consistency and token freshness.
- Payment processing issues: inspect webhook payload/signature and idempotency keys.
- GPS/location issues: validate client permissions and provider keys.
- Upload issues: confirm payload size and storage permissions.

## Performance issues
- API slowness: inspect route latency and expensive list filters.
- High memory/CPU: profile hot endpoints and reduce payload sizes.
- Query optimization: index `status`, `userId`, and timestamp-heavy filters.

## Error code reference
- `400` invalid request body
- `401` missing/invalid token
- `403` role not authorized
- `404` missing resource
- `429` rate limit exceeded
- `500` internal server error

## Logging and debugging
- Backend logs via logger utility in `src/utils/logger.ts`.
- Include request correlation via `X-Request-Id`.
- Reproduce using Postman collection + local docker stack.

## Support escalation
1. Capture request ID and timestamp.
2. Attach endpoint/payload metadata.
3. Escalate to on-call platform/admin owner.
