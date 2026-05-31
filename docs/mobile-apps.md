# Mobile App Documentation

## Driver mobile app (`mobile/`)
- Install: `npm ci`
- Run: `npm start`
- Validate: `npm run typecheck && npm run test:ci`
- Features: onboarding/KYC, ride handling, earnings, notifications, support.

## Passenger mobile app (`mobile-passenger/`)
- Install: `npm ci`
- Validate: `npm run typecheck && npm run test:ci`
- Features: booking, food ordering, tracking, wallet, support.

## Restaurant mobile app
- A dedicated restaurant mobile workspace is not currently present in this repository.
- Restaurant operators should currently use web dashboard capabilities documented in `docs/web-apps.md`.

## Troubleshooting
- Verify Expo/Node versions.
- Clear Metro cache if stale bundles appear.
- Confirm API base URL environment variables.
