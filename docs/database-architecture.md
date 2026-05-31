# Database Architecture

## Storage model
- Primary runtime store is abstracted in `src/database/data.store.ts`.
- Modes:
  - `memory` for local/ephemeral use
  - `file` for persisted local and containerized runs

## Entities (ER overview)
Key logical entities include:
- Users (rider, driver, admin)
- Driver profiles and KYC artifacts
- Rides and ride events
- Wallet balances and ledger entries
- Payments/refunds/webhook events
- Support tickets and safety incidents
- Promotions, referrals, markets, subscriptions, loyalty accounts

## Relationships
- User 1:N rides (rider and driver perspectives)
- Ride 1:N payment events and chat messages
- User 1:N support tickets and safety incidents
- Market 1:N promotions/orders/dispatch options

## Indexing strategy
- Index by primary identifiers (`id`, `rideId`, `userId`).
- Add compound indexes for list filters: `(userId, createdAt)`, `(status, createdAt)`.
- Index webhook idempotency key (`paymentIntentId` / external event id).
