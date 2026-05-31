# Performance Optimization Guide

## Backend
- Profile hot routes and reduce payload sizes.
- Add caching for repetitive read-heavy endpoints.
- Batch background operations via queue workers.

## Frontend/mobile
- Use lazy-loading and route splitting.
- Optimize images and avoid oversized bundles.
- Track render and API latency telemetry.

## Database/cache
- Index high-cardinality filters.
- Use cache-aside for frequently repeated reads.
