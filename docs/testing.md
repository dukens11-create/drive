# Testing Documentation

## Strategy
- Unit tests for isolated logic.
- Integration tests for API domain flows.
- E2E-oriented tests for mobile critical paths.
- Security/performance checks in CI pipelines.

## Commands
### Backend
```bash
npm ci
npm test
```

### Admin
```bash
cd admin
npm ci
npm run lint
npm run typecheck
npm run build
```

### Web
```bash
cd web
npm ci
npm run typecheck
npm run build
```

### Mobile
```bash
cd mobile
npm ci
npm run typecheck
npm run test:ci
npx expo export --platform android --platform ios
```

## Test data
- Create dedicated rider/driver/admin test accounts.
- Use test payment intents and non-production credentials.
