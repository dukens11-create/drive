# Drive

Drive is now a TypeScript codebase with:

- Backend API at repository root (Node.js + TypeScript)
- Mobile driver app at `mobile/` (React Native + Expo Router + NativeWind)

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

Run backend tests:

```bash
npm test
```

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

## CI

- GitHub Actions (`.github/workflows/ci.yml`) runs backend install/build/tests and mobile typecheck + Jest coverage checks on PRs.
- Codemagic (`codemagic.yaml`) runs Expo mobile install/typecheck and EAS local Android APK build from `mobile/` (requires secure `EXPO_TOKEN`).
