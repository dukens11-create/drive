# Drive

Drive is now a TypeScript codebase with:

- Backend API under `src/` with controllers, services, routes, schemas, and shared infrastructure modules
- Mobile driver app at `mobile/` (React Native + Expo Router + NativeWind)
- Admin dashboard at `admin/` (Next.js + TypeScript + Tailwind CSS)
- Restaurant admin dashboard at `restaurant-admin/` (Next.js + TypeScript + Tailwind CSS)
- Passenger web app at `web/` (Next.js + TypeScript + Tailwind CSS)

## Documentation

- Full documentation hub: **[docs/README.md](./docs/README.md)**
- API specification: **[docs/api/openapi.yaml](./docs/api/openapi.yaml)**
- Endpoint catalog: **[docs/api/endpoints.md](./docs/api/endpoints.md)**
- Backend README: **[src/README.md](./src/README.md)**
- Driver mobile README: **[mobile/README.md](./mobile/README.md)**
- Passenger mobile README: **[mobile-passenger/README.md](./mobile-passenger/README.md)**

## Mobile app: Drive Home

The `mobile/` app includes a production-style Uber-inspired driver home experience:

- Full-screen Google map background with traffic overlay
- Live GPS tracking and recenter control
- Zoom + route overview camera controls
- Nearby ride indicators
- Pickup/dropoff route rendering with turn-by-turn hint + ETA
- Trip trace polyline for real-time route tracking
- Top profile/status section (avatar, name, online toggle, notifications)
- Animated bottom stats panel (collapsed and expanded content)
- Live ride request popup with timer and accept/decline actions + incoming sound
- Bottom navigation (Home, Trips, Earnings, Inbox, Profile)
- Real-time mocked state architecture designed for Firebase integration
- Built-in observability for app lifecycle, screen timings, API latency, crash capture, and trip/action telemetry

### Mobile setup

```bash
cd mobile
npm install
npm start
```

Useful mobile commands:

```bash
npm run android
npm run ios
npm run typecheck
npm test
npm run test:coverage
```

### Mobile testing and QA

- Unit tests live in `mobile/test/unit` and focus on business logic and utility behavior.
- Integration tests live in `mobile/test/integration` and validate key UI flows such as onboarding, request acceptance, and trip completion.
- End-to-end style critical-path tests live in `mobile/test/e2e` using React Native Testing Library.
- Coverage is enforced in `mobile/jest.config.js` via global thresholds to catch regressions early.

Local testing workflow:

```bash
cd mobile
npm ci
npm run typecheck
npm run test:ci
```

Best practices:

- Keep tests close to the user flow they validate and prefer assertions on visible behavior.
- Mock only network/native boundaries and keep business logic assertions deterministic.
- Add/adjust tests in the same PR as behavior changes to keep coverage meaningful.

Firebase-ready config is located in `mobile/app.json` under `expo.extra.firebase`.
If those values are populated, the app service layer can initialize Firebase.

## Backend quick start

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Backend source is organized under `src/`:

- `src/controllers` – request handlers
- `src/services` – domain logic
- `src/routes` – Express route registration
- `src/schemas` – Zod request schemas
- `src/middleware`, `src/utils`, `src/config` – shared runtime helpers
- `src/database`, `src/queues`, `src/websocket`, `src/constants` – infrastructure modules
- `tests/` – backend route and service integration tests

Run backend tests:

```bash
npm test
```

## Admin dashboard

```bash
cd admin
cp .env.example .env.local
npm ci
npm run lint
npm run build
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` to the backend base URL, such as `http://localhost:8080`.
The admin app includes:

- KPI dashboard with live driver/ride map and notifications
- Analytics, driver, ride, payment, user, support, safety, promotions, settings, and reports sections
- JWT-backed admin login against the existing backend API
- Advanced admin exports/imports with reusable job history, bulk actions, compliance snapshots, and print/PDF-friendly reporting views
- Dockerfile for standalone admin container builds

## Restaurant admin dashboard

```bash
cd restaurant-admin
cp .env.example .env.local
npm ci
npm run lint
npm run typecheck
npm run build
npm run dev
```

Set `NEXT_PUBLIC_RESTAURANT_API_BASE_URL` and optional `NEXT_PUBLIC_RESTAURANT_SOCKET_URL` for live data updates.
The restaurant admin app includes:

- Authentication flows (login, email verification, password reset, remember me, logout/session handling)
- Restaurant dashboard sections for orders, menu, analytics, profile, earnings, staff, reviews, promotions, support, delivery, and account settings
- Redux Toolkit state management, React Query data loading, dark mode with `next-themes`, and Socket.IO real-time order updates
- Responsive mobile/tablet/desktop layout with quick actions and analytics widgets

## Android builds (APK / AAB)

See **[PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md)** for a full step-by-step guide on generating APK and AAB files for testing and Play Store submission using Expo EAS (recommended) or React Native CLI.

### Codemagic + Expo token requirement

Codemagic Android builds use EAS non-interactive auth and require a secure `EXPO_TOKEN`.

1. Install and log in to EAS locally:
   - `npm install -g eas-cli`
   - `eas login`
2. Generate a token:
   - `eas token:create`
3. In Codemagic, open your project → **Settings** → **Environment variables**.
4. Add a new **Secure** variable named `EXPO_TOKEN` and paste the token value.
5. Save and rerun the workflow.


## Infrastructure assets

- Kubernetes manifests for namespaces, deployments, services, ingress, stateful workloads, daemonsets, and HPA are in `k8s/`.
- Monitoring stack templates (Prometheus/Grafana/ELK) are in `monitoring/`.
- Database bootstrap, migration, backup, and restore templates are in `database/` and `scripts/database/`.
- Multi-service local stack is defined in `docker-compose.yml` (API, worker, Redis, admin, passenger web, restaurant web dashboard).

## CI

- GitHub Actions (`.github/workflows/ci.yml`) runs backend build/test/audit checks, admin lint/build validation, mobile typecheck/Jest coverage/Expo export checks, web typecheck/build checks, dependency review on PRs, and auto-builds optional passenger/restaurant app workspaces when they are added to the repository.
- GitHub Actions (`.github/workflows/codeql.yml`) runs scheduled and PR CodeQL analysis for repository security scanning.
- GitHub Actions (`.github/workflows/release.yml`) uses Release Please for semantic versioning and changelog generation.
- GitHub Actions (`.github/workflows/deploy.yml`) publishes smoke-tested backend container images to GHCR for development, staging, and production promotion via GitHub Environments.
- Codemagic (`codemagic.yaml`) runs Expo mobile install/typecheck and EAS local Android APK build from `mobile/` (requires secure `EXPO_TOKEN`).

See **[CI_CD.md](./CI_CD.md)** for the full CI/CD, deployment, environment, and rollback workflow.

## Passenger web app

The `web/` app provides a responsive passenger experience with:

- JWT-ready email/phone authentication screens
- Ride booking, scheduling, and favorite destination flows
- Live ride tracking shell with Socket.IO room subscription support
- Wallet, receipts, transaction exports, and payment method management
- Promotions, referrals, support tickets, and account preferences
- Dark mode, locale switching, text scaling, and high-contrast accessibility controls
- SEO metadata, sitemap, robots, manifest, and a standalone Docker build

### Web setup

```bash
cd web
npm ci
cp .env.example .env.local
npm run build
```

Useful web environment variables:

- `NEXT_PUBLIC_API_BASE_URL` – backend API origin for auth/rides/wallet/support integration
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – enables live Google Places autocomplete
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` – enables Google Analytics
- `NEXT_PUBLIC_ENABLE_API_LOGS=true` – prints request/response logs in the browser console

### Web validation

```bash
cd web
npm run typecheck
npm run build
```
