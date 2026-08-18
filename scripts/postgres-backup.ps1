param(
  [string]$OutputDirectory = ".\backups"
)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw "pg_dump is required" }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$file = Join-Path $OutputDirectory "flupflap-$stamp.dump"
& pg_dump --format=custom --no-owner --no-acl --file=$file $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
$hash = (Get-FileHash -Algorithm SHA256 $file).Hash
Write-Host "Backup created: $file"
Write-Host "SHA256: $hash"