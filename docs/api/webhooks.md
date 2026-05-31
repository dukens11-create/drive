# Webhook Documentation

## Stripe webhook endpoint
- Path: `POST /api/payments/stripe-webhook`
- Auth: bearer token
- Purpose: confirm payment intents and apply idempotent settlement updates

## Webhook events
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

## Required headers
- `Content-Type: application/json`
- `Stripe-Signature` (recommended for source verification)
- `X-Request-Id` (optional request correlation)

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

## Success response
```json
{
  "ok": true,
  "captured": true
}
```

## Retry behavior
- Delivery must be idempotent; duplicate events must not duplicate wallet credits.
- Retry with exponential backoff on `>=500` responses.
- Stop retrying on `2xx` and explicitly log permanent `4xx` failures for follow-up.

## Security verification
- Validate webhook signature when available.
- Reject malformed payloads and unknown event types.
- Record and deduplicate by provider event ID / `paymentIntentId`.

## Testing webhooks
1. Use sandbox/test payment credentials.
2. Replay representative event payloads from `docs/api/usage-examples.md` and Postman collection.
3. Verify idempotency by sending the same event twice.
4. Confirm ledger, ride, and refund state transitions.
