# Developer Guide

## Getting started
1. Install Node 20+ and npm.
2. Clone repository and run `npm ci`.
3. Configure `.env` from `.env.example`.
4. Start backend: `npm run dev`.
5. First API call: `GET /health`.

## Project structure
- `src/` backend API
- `admin/` admin dashboard
- `web/` passenger web
- `mobile/` driver mobile app
- `mobile-passenger/` passenger mobile app

## Code style
- TypeScript-first, explicit types for public APIs.
- Keep schemas in `src/schemas`, handlers in `src/controllers`, domain logic in `src/services`.
- Validate input with Zod before service execution.

## Development workflow
- Branch naming: `feature/<scope>`, `fix/<scope>`, `docs/<scope>`.
- Commit format: imperative and scoped.
- PR checklist: tests, security, docs, rollback notes.

## Common tasks
- Add endpoint: schema -> service -> controller -> route -> tests -> docs.
- Add migration/seed: update scripts and run `npm run db:migrate` / `npm run db:seed`.
- Add UI screen: page/component + API integration + test.

## Database management
- Migrations: `npm run db:migrate`
- Seeds: `npm run db:seed`
- Backups: file datastore snapshot or persistent volume backup.
