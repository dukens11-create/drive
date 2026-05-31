# System Architecture

## High-level architecture
1. Backend API (`src/`) exposes REST + Socket.IO.
2. Admin web app (`admin/`) and passenger web app (`web/`) consume API.
3. Driver mobile app (`mobile/`) and passenger mobile app (`mobile-passenger/`) consume API.
4. Redis-backed queues (`src/queues`) process asynchronous jobs.

## Service interaction
- Auth service issues JWTs consumed by route middleware.
- Ride lifecycle service coordinates rider/driver states and payments.
- Support/safety/admin services handle escalations, risk, and governance.
- Marketplace/carpool/corporate modules support multi-vertical operations.

## Data flow
1. Client authenticates via `/api/auth/*`.
2. Client submits domain operation (`rides`, `payments`, `support`, etc.).
3. Service updates data store (`src/database`).
4. Realtime updates are broadcast over Socket.IO where applicable.

## Component diagram (text)
`Clients -> API Routes -> Controllers -> Services -> Data Store / Queue / External Providers`
