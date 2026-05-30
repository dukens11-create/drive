# Drive Passenger Web

Passenger-facing web application for ride booking and account management.

## Commands

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- `NEXT_PUBLIC_ENABLE_API_LOGS`

## Highlights

- Authentication screens for email/phone login and signup
- Booking, scheduling, ride history, and live trip tracking flows
- Wallet, receipt export, payment methods, promotions, and referrals
- Support ticketing, saved addresses, emergency contacts, and accessibility settings
- Next.js app router, Tailwind CSS, PWA manifest, sitemap, robots, and Docker build
