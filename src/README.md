# Drive Backend API

Backend implementation lives in this `src/` directory.

## Structure
- `controllers/` request handlers
- `services/` domain logic
- `routes/` HTTP route registration
- `schemas/` request validation contracts
- `middleware/` auth/error handling
- `database/` data access and seeds/migrations
- `queues/` asynchronous jobs
- `websocket/` realtime channels

## Run and validate
```bash
npm ci
npm run build
npm test
```

## API docs
- OpenAPI: `docs/api/openapi.yaml`
- Endpoint list: `docs/api/endpoints.md`
