# Contributing Guide

## Contribution workflow
1. Branch from latest `main` using a focused scope.
2. Implement minimal, reviewable changes.
3. Run required lint/typecheck/test commands.
4. Update relevant docs/changelog when behavior changes.
5. Open PR with clear summary, validation evidence, and risk notes.

## Code style and naming
- Use existing TypeScript and framework conventions.
- Prefer clear, descriptive names for routes, service methods, and schema fields.
- Keep business logic in services; keep controllers thin.

## Pull request process
- Include objective, scope boundaries, and rollback considerations.
- Use imperative commit messages with clear scope.
- Address review feedback and keep discussion constructive.
- Approval is required before merge to protected branches.

## Branching strategy
- `feature/<scope>` for net-new functionality
- `fix/<scope>` for bug fixes
- `docs/<scope>` for documentation-only changes

## Testing requirements
- Backend: `npm ci && npm test`
- Admin/Web/Restaurant/Mobile: run package-local commands from `docs/testing.md`
- Add/adjust unit or integration tests for behavior changes.

## Documentation requirements
- Update endpoint docs for API contract changes.
- Update README/guides when setup or usage changes.
- Add migration notes for breaking changes.

## Issue reporting
- Use GitHub Issues with reproducible steps and expected/actual behavior.
- Feature requests should include business value and acceptance criteria.
- Use Discussions for open-ended design conversations.

## Code of Conduct
- This project follows the Contributor Covenant in `CODE_OF_CONDUCT.md`.
