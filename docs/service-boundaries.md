# Service Boundaries and Communication

## Service boundaries
- `auth`, `rides`, `drivers`, `payments`, `wallet`, `support`, `safety`, `admin`, `marketplace`, `merchant`, `analytics`, `fraud`, `corporate`, `subscription`, `scheduled`, `loyalty`, `carpool`, `2fa`.

## Inter-service communication
- In-process service calls through controllers/services.
- Async workflows through queue modules when needed.

## Data ownership
- Each domain service owns its aggregate and update rules.
- Cross-domain writes are mediated through service-layer orchestration.
