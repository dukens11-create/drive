# Postman Guide

## Complete API collection
- Import `docs/api/postman/Drive.postman_collection.json`.
- Import `docs/api/postman/Drive.postman_environment.json`.

## Environment setup
Set values:
- `baseUrl` (for example `http://localhost:8080`)
- `accessToken`
- `refreshToken`

## Pre-request script
Collection-level pre-request script automatically adds `X-Request-Id` for request tracing.

## Test script
Collection-level test script validates:
- response status is below 500
- content-type header exists on successful responses

## Export/import procedures
### Export
1. In Postman, open the collection.
2. Select **Export** and choose v2.1 format.
3. Commit to `docs/api/postman/`.

### Import
1. Open Postman **Import**.
2. Select collection JSON and environment JSON.
3. Choose environment and run requests.
