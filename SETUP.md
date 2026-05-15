# Setup

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run build`.
4. Start the API with `npm start`.

## Optional local persistence bootstrap

- Default mode is in-memory (`DATA_STORE_MODE=memory`).
- To persist data across restarts, set:
  - `DATA_STORE_MODE=file`
  - `DATA_STORE_FILE=.data/store.json` (or another writable path)

## Basic test run

Run `npm test` to compile and execute core API route tests.

## Health endpoints

- `/health` basic service status
- `/livez` liveness probe
- `/readyz` readiness probe with process uptime

## Docker quick run

1. `docker build -t flupflap-ride .`
2. `docker run --rm -p 8080:8080 --env-file .env flupflap-ride`
