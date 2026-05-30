# Setup

## Backend

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run build`.
4. Start the API with `npm start`.

## Mobile (Expo)

1. `cd mobile`
2. `npm install`
3. `npm start`

Optional mobile validation:
- `npm run typecheck`

## Basic backend test run

Run `npm test` to compile and execute core API route tests.

## Health endpoints

- `/health` basic service status
- `/livez` liveness probe
- `/readyz` readiness probe with process uptime

## Docker quick run

1. `docker build -t drive .`
2. `docker run --rm -p 8080:8080 --env-file .env drive`

## Docker Compose stack

1. `cp .env.development.example .env`
2. `docker compose up --build`

This starts:

- Redis
- API container on `http://localhost:8080`
- queue worker container

## CI/CD reference

See `CI_CD.md` for GitHub Actions, release automation, deployment promotion, and environment configuration details.
