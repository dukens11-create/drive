# Disaster Recovery Guide

## Backup procedures
- Snapshot persistent datastore/volumes daily.
- Preserve deployment metadata and release artifacts.

## Recovery procedures
1. Restore last known-good backup.
2. Redeploy stable application image.
3. Re-run health checks and critical transaction tests.

## Targets
- RTO: <= 2 hours
- RPO: <= 15 minutes (production target with frequent snapshots/log shipping)

## DR testing
- Conduct quarterly restore drills and incident simulations.
