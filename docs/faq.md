# FAQ

## General
- **Q:** Which API version is current?  
  **A:** `v1` endpoints under `/api/*`.

## Passenger
- **Q:** Why was my ride canceled?  
  **A:** Driver timeout, support action, or payment/auth failure.

## Driver
- **Q:** Why can't I go online?  
  **A:** Pending onboarding/KYC or missing documents.

## Restaurant
- **Q:** Why is my menu hidden?  
  **A:** Item/category availability or compliance status.

## Admin
- **Q:** Where are audit events?  
  **A:** `GET /api/admin/audit-log`.

## Developer
- **Q:** How do I run all required checks?  
  **A:** Use backend/admin/web/mobile validation commands listed in `docs/testing.md`.
