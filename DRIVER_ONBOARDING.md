# Driver Onboarding

Apply, upload docs, KYC, background check, admin approval, training, first ride monitoring.

Current backend verification states:
- `documents_pending` → application created, waiting for minimum documents
- `kyc_pending` → documents received, waiting for KYC verification webhook
- `verified` → driver can move from `offline` to `online` when location is set
- `rejected` → driver is unavailable for dispatch
