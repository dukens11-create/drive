# Quick Start Guide

## 5-minute setup
1. `npm ci`
2. `cp .env.example .env`
3. `npm run dev`
4. Verify `GET http://localhost:8080/health`
5. Make first authenticated call after `POST /api/auth/login`

## 30-minute deep dive
- Start backend and at least one client app (`web/` or `admin/`).
- Execute ride request + completion flow.
- Execute food ordering and payment webhook replay flow.
- Review logs, metrics, and troubleshooting paths.

## Advanced guides
- Performance tuning: `docs/performance.md`
- Scalability and resilience: `docs/scalability.md`, `docs/disaster-recovery.md`
- Security hardening: `docs/security.md`
