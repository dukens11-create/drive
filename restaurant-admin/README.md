# Drive Restaurant Admin Dashboard

Restaurant manager/owner dashboard built with Next.js, TypeScript, Tailwind CSS, Redux Toolkit, React Query, shadcn-style UI primitives, next-themes, and Socket.IO.

## Setup

```bash
cp .env.example .env.local
npm ci
npm run lint
npm run typecheck
npm run build
npm run dev
```

## Environment

- `NEXT_PUBLIC_RESTAURANT_API_BASE_URL` (default: `http://localhost:8080`)
- `NEXT_PUBLIC_RESTAURANT_SOCKET_URL` (optional, falls back to API URL)
