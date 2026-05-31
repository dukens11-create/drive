# Web App Documentation

## Admin dashboard (`admin/`)
- Setup: `cp .env.example .env.local && npm ci`
- Validate: `npm run lint && npm run typecheck && npm run build`
- Includes user/driver/ride/payment/support/analytics operations.

## Passenger web app (`web/`)
- Setup: `cp .env.example .env.local && npm ci`
- Validate: `npm run typecheck && npm run build`
- Includes booking, ride history, tracking, wallet, and support.

## Restaurant dashboard
- A dedicated restaurant dashboard workspace is not currently present in this repository.
- Restaurant operations currently map to API and admin workflows documented in `docs/user-guides.md` and `docs/api/endpoints.md`.

## Troubleshooting
- Ensure `NEXT_PUBLIC_API_BASE_URL` points to backend API.
- Rebuild after env updates.
