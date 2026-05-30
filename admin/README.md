# Drive Admin Dashboard

Next.js admin console for Drive operations.

## Setup

```bash
cp .env.example .env.local
npm ci
npm run lint
npm run build
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` to the backend base URL (for example `http://localhost:8080`).

## Features

- Admin JWT login against the root Drive API
- Operational dashboard, analytics, drivers, rides, payments, users, support, safety, promotions, settings, and reports views
- Live admin notifications via Socket.IO for driver status and SOS events
- CSV export helpers and print/PDF-friendly reports
- Dark mode and tablet-friendly responsive layout
