param(
  [Parameter(Mandatory=$true)][string]$BackupFile
)
$ErrorActionPreference = "Stop"
if (-not $env:RESTORE_DATABASE_URL) { throw "RESTORE_DATABASE_URL is required and must point to a non-production restore target" }
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw "pg_restore is required" }

$target = [Uri]$env:RESTORE_DATABASE_URL
if ($target.Host -match "(^|\.)(prod|production)(\.|$)") {
  throw "Refusing a restore target whose hostname looks like production"
}

& pg_restore --clean --if-exists --no-owner --no-acl --dbname=$env:RESTORE_DATABASE_URL $BackupFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }
Write-Host "Restore completed. Start FlupFlap against this isolated database and run smoke/integrity checks."