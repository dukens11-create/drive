# PostgreSQL Backup and Restore Runbook

## Backup
Use `scripts/postgres-backup.ps1`. The script requires `DATABASE_URL` and `pg_dump`.

Recommended:
- automated encrypted daily full backup;
- provider point-in-time recovery where available;
- retention appropriate to legal/accounting obligations;
- separate backup access credentials;
- monthly restore drill to a non-production database.

## Restore drill
1. Create an isolated empty database.
2. Set `RESTORE_DATABASE_URL` to that database only.
3. Run `scripts/postgres-restore.ps1 -BackupFile <backup>`.
4. Start FlupFlap against the restored database in staging.
5. Verify `/readyz`.
6. Verify users, rides, payment records, restaurant/menu/order state, and POS connection metadata.
7. Record recovery time and any errors.

Never run the restore script against production while the application is accepting writes.