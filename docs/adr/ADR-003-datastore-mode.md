# ADR-003: Hybrid in-memory/file datastore for local environments

## Decision
Support `memory` and `file` data store modes via environment configuration.

## Trade-offs
- Pros: easy local setup and deterministic integration tests.
- Cons: not a substitute for production-grade managed databases.

## Alternatives considered
- SQLite-only local mode, managed DB-only development.
