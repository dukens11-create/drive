# Release Management

## Release checklist
- CI green (backend, admin, web, mobile).
- Security checks green (CodeQL/dependency review).
- Docs/changelog updated.
- Rollback plan documented.

## Version numbering
- Semantic versioning managed by Release Please.

## Breaking changes and deprecations
- Document migration steps and deprecation windows.

## Hotfix procedure
1. Branch from latest release.
2. Implement minimal fix.
3. Run focused validations.
4. Promote with expedited review.
