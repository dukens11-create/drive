# Deployment Guide

## Prerequisites
- Docker, Node 20+, GitHub repository access, GHCR permissions.
- Staging/production secrets configured in GitHub Environments.

## Local development deployment
```bash
cp .env.development.example .env
docker compose up --build
```
Health check: `GET /health` on `http://localhost:8080`.

## Staging deployment
- Trigger push on `release/**` or manual `workflow_dispatch` selecting `staging`.
- Deploy workflow builds/smoke-tests/pushes tagged image.
- Run staging verification: health, auth login, ride request lifecycle, payment webhook replay.

## Production deployment
- Run `Deploy` workflow with `environment=production`.
- Ensure required reviewers approve production environment.
- Verify health endpoint and deployment metadata artifact.
- Execute post-deployment verification for core endpoints and realtime sockets.

## Rollback
- Redeploy previous known-good image tag from GHCR.
- Re-run smoke checks and verify critical endpoints.

## Zero-downtime updates
- Deploy stateless API containers behind load balancer.
- Use rolling updates and run migrations in backward-compatible mode.

## Maintenance mode
- Enable maintenance mode at edge/API gateway (serve maintenance banner and block writes).
- Notify users via push/SMS/email before and during maintenance windows.
- Disable maintenance mode only after health checks and smoke tests pass.
