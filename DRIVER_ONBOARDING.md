# Driver Onboarding

Apply, upload docs, KYC, background check, admin approval, training, first ride monitoring.

Current backend verification states:
- `documents_pending` → application created, waiting for minimum documents
- `kyc_pending` → license scan + selfie received, waiting for KYC verification webhook
- `review_pending` → OCR text and selfie verification are ready, waiting for admin document review
- `verified` → driver can move from `offline` to `online` when location is set
- `rejected` → driver is unavailable for dispatch
