# Webhook Documentation

## Stripe webhook endpoint
- Path: `POST /api/payments/stripe-webhook`
- Auth: bearer token
- Purpose: confirms payment intents and applies idempotent settlement updates.

## Required headers
- `Content-Type: application/json`
- `Stripe-Signature` (recommended)
- `X-Request-Id` (optional correlation)

## Payload contract
```json
{
  "requestId": "req_123",
  "type": "payment_intent.succeeded",
  "paymentIntentId": "pi_123",
  "metadata": {
    "rideId": "ride_123",
    "riderId": "user_rider_123",
    "driverId": "user_driver_123"
  }
}
```

## Response
```json
{
  "ok": true,
  "captured": true
}
```

## Retry behavior
- Delivery must be idempotent; duplicate events should not duplicate wallet credits.
- Retry with exponential backoff on `>=500`.
