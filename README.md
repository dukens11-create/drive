# Drive

Drive is now a TypeScript codebase with:

- Backend API at repository root (Node.js + TypeScript)
- Mobile driver app at `mobile/` (React Native + Expo Router + NativeWind)

## Mobile app: Drive Home

The `mobile/` app includes a production-style Uber-inspired driver home experience:

- Full-screen Google map background with traffic overlay
- Live GPS tracking and recenter control
- Nearby ride indicators
- Top profile/status section (avatar, name, online toggle, notifications)
- Animated bottom stats panel (collapsed and expanded content)
- Live ride request popup with timer and accept/decline actions + incoming sound
- Bottom navigation (Home, Trips, Earnings, Inbox, Profile)
- Real-time mocked state architecture designed for Firebase integration

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
```

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

## CI

- GitHub Actions (`.github/workflows/ci.yml`) runs backend install/build/tests.
- Codemagic (`codemagic.yaml`) runs Expo mobile install/typecheck/export from `mobile/`.
