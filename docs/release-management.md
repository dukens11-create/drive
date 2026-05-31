# Release Management

## Version control
- Semantic versioning (MAJOR.MINOR.PATCH).
- Version numbers are managed by release automation and tagged in git.
- Use release branches when coordinating larger launch trains.

## Release process
1. Plan scope and confirm acceptance criteria.
2. Ensure CI, security checks, and required validations pass.
3. Prepare release notes and changelog entries.
4. Publish release and monitor production health.
5. Announce breaking changes and migration steps when applicable.

## Release notes template
- New features
- Bug fixes
- Breaking changes
- Deprecations
- Migration guide links

## Rollout strategy
- Prefer staged rollout (beta/canary/gradual).
- Use feature flags for high-risk capabilities.
- Keep rollback plan with known-good artifact references.

## Deprecation and backward compatibility
- Communicate deprecation windows in advance.
- Preserve backward-compatible behavior where possible.
- Provide endpoint/field migration guidance before removal.

## Hotfix procedure
1. Branch from latest release.
2. Implement targeted fix and focused tests.
3. Expedite review/approval.
4. Release and verify with post-deploy smoke tests.
