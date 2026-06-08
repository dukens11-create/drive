# Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime mode |
| `PORT` | No | `8080` | API listen port |
| `LOG_LEVEL` | No | `info` | `debug/info/warn/error` |
| `JWT_SECRET` | Prod: Yes | `dev-local-secret` | JWT signing secret |
| `ADMIN_SEED_PASSWORD` | Prod: Yes | `Test123!Drive` | Admin seed credential |
| `TEST_RIDER_SEED_PASSWORD` | No | `Test123!Drive` | Development rider seed credential |
| `TEST_DRIVER_SEED_PASSWORD` | No | `Test123!Drive` | Development driver seed credential |
| `STRIPE_WEBHOOK_SECRET` | Optional | empty | Payment webhook verification |
| `DATA_STORE_MODE` | No | `memory` (runtime fallback) | `memory` or `file` (`.env` sets `file` for development) |
| `DATA_STORE_FILE` | No | `.data/store.json` | File datastore path |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:8080,http://127.0.0.1:8080` | Comma-separated origins for credentialed browser auth requests |
| `REDIS_URL` | Queue mode | `redis://localhost:6379` | Redis endpoint |
| `TWILIO_ACCOUNT_SID` | Optional | empty | SMS integration |
| `TWILIO_AUTH_TOKEN` | Optional | empty | SMS integration |
| `TWILIO_FROM_NUMBER` | Optional | empty | SMS sender |
| `SENDGRID_API_KEY` | Optional | empty | Email integration |
| `SENDGRID_FROM_EMAIL` | Optional | empty | Email sender |
| `FCM_SERVER_KEY` | Optional | empty | Push notifications |
| `APP_BASE_URL` | No | `https://app.drive.com` | Link generation base URL |
| `SENTRY_DSN` | Optional | empty | Error monitoring sink |

## Environment profiles
- Development: `.env.development.example`
- Staging: `.env.staging.example`
- Production: `.env.production.example`
