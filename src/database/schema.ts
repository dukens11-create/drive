/**
 * PostgreSQL schema definition.
 *
 * All tables are created with IF NOT EXISTS so this is safe to run multiple
 * times (idempotent).  Complex nested objects (arrays, sub-documents) are
 * stored as JSONB to preserve full fidelity with the existing TypeScript types
 * while keeping the schema simple for Phase 1.
 *
 * Phase 2 will normalise selected JSONB columns into proper relational tables
 * once the migration is battle-tested.
 */

export const SCHEMA_SQL = /* sql */ `

-- ─── Schema migrations tracker ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE,
  phone       TEXT UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('rider','driver','merchant','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- ─── Refresh token sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_token_sessions (
  session_id      TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  device_name     TEXT
);
CREATE INDEX IF NOT EXISTS idx_rts_user_id ON refresh_token_sessions (user_id);

-- ─── TOTP / MFA ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS totp_entries (
  user_id      TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  secret       TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at  TIMESTAMPTZ,
  backup_codes JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── KYC status ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_status (
  user_id    TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('pending','verified','rejected')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Drivers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  user_id                  TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  current_trip_id          TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected')),
  verification_state       TEXT NOT NULL DEFAULT 'documents_pending'
                             CHECK (verification_state IN (
                               'documents_pending','kyc_pending','review_pending',
                               'verified','rejected')),
  availability_status      TEXT NOT NULL DEFAULT 'offline'
                             CHECK (availability_status IN ('offline','online','assigned','unavailable')),
  available                BOOLEAN NOT NULL DEFAULT FALSE,
  lat                      DOUBLE PRECISION,
  lng                      DOUBLE PRECISION,
  last_location_updated_at TIMESTAMPTZ,
  rating                   DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  acceptance_rate          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  cancellation_rate        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  earnings_cents           BIGINT NOT NULL DEFAULT 0,
  documents                JSONB NOT NULL DEFAULT '[]',
  verification_documents   JSONB NOT NULL DEFAULT '[]',
  selfie_verification      JSONB,
  verification_review      JSONB
);

-- ─── Riders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riders (
  user_id                  TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  current_trip_id          TEXT,
  lat                      DOUBLE PRECISION,
  lng                      DOUBLE PRECISION,
  last_location_updated_at TIMESTAMPTZ,
  vehicle_preference       TEXT,
  route_preference         TEXT,
  favorite_locations       JSONB NOT NULL DEFAULT '[]',
  rating                   DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  review_count             INT NOT NULL DEFAULT 0
);

-- ─── Rides ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id                      TEXT PRIMARY KEY,
  rider_id                TEXT NOT NULL REFERENCES users (id),
  driver_id               TEXT REFERENCES users (id),
  pickup_lat              DOUBLE PRECISION,
  pickup_lng              DOUBLE PRECISION,
  dropoff_lat             DOUBLE PRECISION,
  dropoff_lng             DOUBLE PRECISION,
  miles                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  minutes                 DOUBLE PRECISION NOT NULL DEFAULT 0,
  fare_estimate           DOUBLE PRECISION NOT NULL DEFAULT 0,
  surge_multiplier        DOUBLE PRECISION,
  promo_id                TEXT,
  discount_cents          INT,
  status                  TEXT NOT NULL DEFAULT 'requested'
                            CHECK (status IN (
                              'requested','accepted','arrived_at_pickup',
                              'started','completed','canceled')),
  lifecycle_state         TEXT,
  rating                  DOUBLE PRECISION,
  review                  TEXT,
  rated_at                TIMESTAMPTZ,
  passenger_rating        DOUBLE PRECISION,
  passenger_review        TEXT,
  passenger_rated_at      TIMESTAMPTZ,
  arrived_at              TIMESTAMPTZ,
  waiting_since           TIMESTAMPTZ,
  wait_timeout_at         TIMESTAMPTZ,
  start_confirmation_at   TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  no_show_reported_at     TIMESTAMPTZ,
  no_show_fee_cents       INT,
  photo_evidence_url      TEXT,
  canceled_at             TIMESTAMPTZ,
  cancellation_reason     TEXT,
  cancellation_actor_role TEXT,
  cancellation_fee_cents  INT,
  payment_status          TEXT,
  fare_details            JSONB,
  events                  JSONB NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rides_rider_id   ON rides (rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id  ON rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status     ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides (created_at);

-- ─── Ride requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ride_requests (
  id                  TEXT PRIMARY KEY,
  ride_id             TEXT NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
  rider_id            TEXT NOT NULL REFERENCES users (id),
  pickup_lat          DOUBLE PRECISION,
  pickup_lng          DOUBLE PRECISION,
  dropoff_lat         DOUBLE PRECISION,
  dropoff_lng         DOUBLE PRECISION,
  fare_estimate       DOUBLE PRECISION NOT NULL DEFAULT 0,
  broadcasted_drivers JSONB NOT NULL DEFAULT '[]',
  responses           JSONB NOT NULL DEFAULT '[]',
  accepted_driver_id  TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'broadcasting'
                        CHECK (status IN ('broadcasting','accepted','expired','canceled','completed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_id ON ride_requests (ride_id);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                          TEXT PRIMARY KEY,
  ride_id                     TEXT REFERENCES rides (id),
  rider_id                    TEXT REFERENCES users (id),
  driver_id                   TEXT REFERENCES users (id),
  payment_method_id           TEXT,
  payment_method_type         TEXT,
  description                 TEXT,
  provider                    TEXT NOT NULL DEFAULT 'stripe_mock',
  provider_intent_id          TEXT NOT NULL,
  provider_checkout_session_id TEXT NOT NULL,
  client_secret               TEXT NOT NULL,
  amount_cents                INT NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'usd',
  status                      TEXT NOT NULL
                                CHECK (status IN ('requires_capture','captured','refunded','failed')),
  captured_at                 TIMESTAMPTZ,
  refunded_at                 TIMESTAMPTZ,
  invoice_id                  TEXT,
  receipt_url                 TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_ride_id   ON payments (ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_rider_id  ON payments (rider_id);
CREATE INDEX IF NOT EXISTS idx_payments_driver_id ON payments (driver_id);

-- ─── Payment methods ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'stripe_mock',
  brand         TEXT,
  label         TEXT,
  last4         TEXT,
  expiry_month  INT,
  expiry_year   INT,
  token         TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods (user_id);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                   TEXT PRIMARY KEY,
  payment_id           TEXT NOT NULL REFERENCES payments (id),
  invoice_number       TEXT NOT NULL UNIQUE,
  invoice_date         TEXT NOT NULL,
  amount_cents         INT NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'usd',
  status               TEXT NOT NULL CHECK (status IN ('issued','refunded')),
  recipient_user_id    TEXT REFERENCES users (id),
  payer_user_id        TEXT REFERENCES users (id),
  payment_method_type  TEXT,
  url                  TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Refunds ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                  TEXT PRIMARY KEY,
  payment_id          TEXT NOT NULL REFERENCES payments (id),
  user_id             TEXT REFERENCES users (id),
  amount_cents        INT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'usd',
  reason              TEXT,
  destination         TEXT NOT NULL CHECK (destination IN ('wallet','original_payment_method')),
  status              TEXT NOT NULL DEFAULT 'succeeded',
  provider_refund_id  TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Wallet balances ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_balances (
  user_id       TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Wallet transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('credit','debit')),
  amount_cents INT NOT NULL,
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON wallet_transactions (user_id);

-- ─── Bank accounts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                         TEXT PRIMARY KEY,
  user_id                    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  bank_name                  TEXT NOT NULL,
  account_holder_name        TEXT NOT NULL,
  account_type               TEXT NOT NULL CHECK (account_type IN ('checking','savings')),
  routing_number             TEXT NOT NULL,
  last4                      TEXT NOT NULL,
  nickname                   TEXT,
  is_default                 BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_external_account_id TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts (user_id);

-- ─── Payout requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  bank_account_id   TEXT NOT NULL REFERENCES bank_accounts (id),
  amount_cents      INT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','paid','failed','canceled')),
  wallet_tx_id      TEXT,
  stripe_payout_id  TEXT,
  failure_reason    TEXT,
  scheduled_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests (user_id);

-- ─── Support tickets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id),
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','in_review','closed')),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);

-- ─── Support ticket replies ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id          TEXT PRIMARY KEY,
  ticket_id   TEXT NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users (id),
  author_role TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON support_ticket_replies (ticket_id);

-- ─── Safety incidents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_incidents (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users (id),
  ride_id      TEXT REFERENCES rides (id),
  type         TEXT NOT NULL,
  details      TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  level        TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','under_review','resolved','dismissed')),
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_id ON safety_incidents (user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_ride_id ON safety_incidents (ride_id);

-- ─── Audit logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY,
  actor_id     TEXT NOT NULL,
  actor_role   TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_id    TEXT,
  target_type  TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id  ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs (target_id);

-- ─── Promos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promos (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value DOUBLE PRECISION NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  min_fare_cents INT,
  max_usages     INT,
  usage_count    INT NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promos_code ON promos (code);

-- ─── Referral codes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  code       TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes (user_id);

-- ─── Referral events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_events (
  id               TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL REFERENCES users (id),
  referred_user_id TEXT NOT NULL REFERENCES users (id),
  bonus_cents      INT NOT NULL,
  paid             BOOLEAN NOT NULL DEFAULT FALSE,
  ride_id          TEXT REFERENCES rides (id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Markets ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS markets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  country     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pre_launch'
                CHECK (status IN ('pre_launch','active','paused','sunset')),
  launched_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Surge config ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surge_config (
  key        TEXT PRIMARY KEY,
  multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  reason     TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Platform settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key                    TEXT PRIMARY KEY,
  maintenance_mode       BOOLEAN NOT NULL DEFAULT FALSE,
  app_version            TEXT NOT NULL DEFAULT '1.0.0',
  commission_rate_percent DOUBLE PRECISION NOT NULL DEFAULT 20.0,
  surge_multiplier       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  feature_flags          JSONB NOT NULL DEFAULT '[]',
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Admin API keys ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  key_preview  TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

-- ─── Admin export jobs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_export_jobs (
  id            TEXT PRIMARY KEY,
  data_type     TEXT NOT NULL,
  format        TEXT NOT NULL,
  filename      TEXT NOT NULL,
  row_count     INT NOT NULL DEFAULT 0,
  columns       JSONB NOT NULL DEFAULT '[]',
  filters       JSONB,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by  TEXT,
  reused_from_id TEXT
);

-- ─── Admin import jobs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_import_jobs (
  id             TEXT PRIMARY KEY,
  data_type      TEXT NOT NULL,
  format         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'preview'
                   CHECK (status IN ('preview','completed','rolled_back')),
  total_records  INT NOT NULL DEFAULT 0,
  valid_records  INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  error_count    INT NOT NULL DEFAULT 0,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by   TEXT,
  errors         JSONB NOT NULL DEFAULT '[]',
  changes        JSONB NOT NULL DEFAULT '[]',
  rollback_at    TIMESTAMPTZ
);

-- ─── Admin bulk jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_bulk_jobs (
  id            TEXT PRIMARY KEY,
  target_type   TEXT NOT NULL,
  action        TEXT NOT NULL,
  total         INT NOT NULL DEFAULT 0,
  processed     INT NOT NULL DEFAULT 0,
  succeeded     INT NOT NULL DEFAULT 0,
  failed        INT NOT NULL DEFAULT 0,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by  TEXT,
  errors        JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'completed'
);

-- ─── Scheduled rides ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_rides (
  id                   TEXT PRIMARY KEY,
  rider_id             TEXT NOT NULL REFERENCES users (id),
  pickup_lat           DOUBLE PRECISION,
  pickup_lng           DOUBLE PRECISION,
  dropoff_lat          DOUBLE PRECISION,
  dropoff_lng          DOUBLE PRECISION,
  pickup_address       TEXT,
  dropoff_address      TEXT,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  status               TEXT NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','dispatched','completed','canceled')),
  ride_id              TEXT REFERENCES rides (id),
  reminder_sent_at     TIMESTAMPTZ,
  canceled_at          TIMESTAMPTZ,
  cancellation_reason  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_rider_id    ON scheduled_rides (rider_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_scheduled_at ON scheduled_rides (scheduled_at);

-- ─── Subscription plans ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  tier                TEXT NOT NULL CHECK (tier IN ('basic','premium','unlimited')),
  price_cents         INT NOT NULL,
  billing_cycle_days  INT NOT NULL DEFAULT 30,
  rides_included      TEXT NOT NULL DEFAULT '0',
  discount_percent    DOUBLE PRECISION NOT NULL DEFAULT 0,
  features            JSONB NOT NULL DEFAULT '[]',
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL REFERENCES subscription_plans (id),
  tier                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','canceled','expired','past_due')),
  rides_used_this_cycle INT NOT NULL DEFAULT 0,
  current_period_start  TIMESTAMPTZ NOT NULL,
  current_period_end    TIMESTAMPTZ NOT NULL,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);

-- ─── Loyalty accounts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id          TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  points           INT NOT NULL DEFAULT 0,
  tier             TEXT NOT NULL DEFAULT 'bronze'
                     CHECK (tier IN ('bronze','silver','gold','platinum')),
  lifetime_points  INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Loyalty transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  points     INT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('earn','redeem','expire','bonus')),
  reason     TEXT NOT NULL,
  ride_id    TEXT REFERENCES rides (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_user_id ON loyalty_transactions (user_id);

-- ─── Corporate accounts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id                   TEXT PRIMARY KEY,
  company_name         TEXT NOT NULL,
  billing_email        TEXT NOT NULL,
  admin_user_id        TEXT NOT NULL REFERENCES users (id),
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('active','suspended','pending')),
  credit_limit_cents   BIGINT NOT NULL DEFAULT 0,
  used_credit_cents    BIGINT NOT NULL DEFAULT 0,
  invoice_cycle_days   INT NOT NULL DEFAULT 30,
  allowed_employee_ids JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Corporate ride tags ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corporate_ride_tags (
  ride_id              TEXT NOT NULL REFERENCES rides (id),
  corporate_account_id TEXT NOT NULL REFERENCES corporate_accounts (id),
  employee_id          TEXT NOT NULL,
  billable_cents       INT NOT NULL DEFAULT 0,
  invoiced             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ride_id, corporate_account_id)
);

-- ─── Carpool rides ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carpool_rides (
  id               TEXT PRIMARY KEY,
  driver_id        TEXT REFERENCES users (id),
  max_passengers   INT NOT NULL DEFAULT 4,
  passengers       JSONB NOT NULL DEFAULT '[]',
  route_start_lat  DOUBLE PRECISION,
  route_start_lng  DOUBLE PRECISION,
  route_end_lat    DOUBLE PRECISION,
  route_end_lng    DOUBLE PRECISION,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','full','in_progress','completed','canceled')),
  departs_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver_id ON carpool_rides (driver_id);

-- ─── Fraud alerts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id),
  ride_id      TEXT REFERENCES rides (id),
  payment_id   TEXT REFERENCES payments (id),
  risk_level   TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  signals      JSONB NOT NULL DEFAULT '[]',
  score        DOUBLE PRECISION NOT NULL DEFAULT 0,
  reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  action       TEXT CHECK (action IN ('none','warn','suspend','ban')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts (user_id);

-- ─── Merchant products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_products (
  id          TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES users (id),
  name        TEXT NOT NULL,
  price_cents INT NOT NULL,
  in_stock    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_products_merchant_id ON merchant_products (merchant_id);

-- ─── Marketplace deliveries ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_deliveries (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','assigned','delivered')),
  eta_minutes INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Chat conversations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK (type IN ('direct','group','support')),
  title            TEXT,
  created_by       TEXT NOT NULL REFERENCES users (id),
  participant_ids  JSONB NOT NULL DEFAULT '[]',
  last_message_id  TEXT,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Chat participants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_participants (
  conversation_id  TEXT NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ,
  muted_until      TIMESTAMPTZ,
  blocked_user_ids JSONB NOT NULL DEFAULT '[]',
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants (user_id);

-- ─── Chat messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                       TEXT PRIMARY KEY,
  conversation_id          TEXT NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  sender_id                TEXT NOT NULL REFERENCES users (id),
  content                  TEXT NOT NULL,
  attachment_url           TEXT,
  attachment_type          TEXT,
  location                 JSONB,
  voice_note_url           TEXT,
  voice_note_duration_secs INT,
  transcription            TEXT,
  translations             JSONB,
  reactions                JSONB NOT NULL DEFAULT '[]',
  read_by                  JSONB NOT NULL DEFAULT '[]',
  edited_at                TIMESTAMPTZ,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id       ON chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at      ON chat_messages (created_at);

-- ─── Quick reply templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Call sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_sessions (
  id            TEXT PRIMARY KEY,
  ride_id       TEXT REFERENCES rides (id),
  caller_id     TEXT NOT NULL REFERENCES users (id),
  callee_id     TEXT NOT NULL REFERENCES users (id),
  status        TEXT NOT NULL DEFAULT 'initiated'
                  CHECK (status IN ('initiated','ringing','active','ended','missed','declined')),
  call_type     TEXT NOT NULL CHECK (call_type IN ('voip','native')),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_secs INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id ON call_sessions (caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_id ON call_sessions (callee_id);

-- ─── Notification logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users (id),
  channel       TEXT NOT NULL CHECK (channel IN ('sms','email','push')),
  recipient     TEXT NOT NULL,
  template      TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('sent','failed','queued')),
  provider      TEXT NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs (user_id);

-- ─── Notification preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id      TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  sms_opt_in   BOOLEAN NOT NULL DEFAULT TRUE,
  push_opt_in  BOOLEAN NOT NULL DEFAULT TRUE,
  frequency    TEXT NOT NULL DEFAULT 'instant'
                 CHECK (frequency IN ('instant','hourly','daily','weekly')),
  categories   JSONB NOT NULL DEFAULT '[]',
  timezone     TEXT NOT NULL DEFAULT 'UTC',
  quiet_hours  JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Device tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  topics     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens (user_id);

-- ─── Driver location history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_location_history (
  id         BIGSERIAL PRIMARY KEY,
  driver_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  accuracy   DOUBLE PRECISION,
  heading    DOUBLE PRECISION,
  speed      DOUBLE PRECISION,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_loc_driver_id ON driver_location_history (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_loc_timestamp  ON driver_location_history (timestamp DESC);

-- ─── Dispatch events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispatch_events (
  id         TEXT PRIMARY KEY,
  sequence   BIGINT NOT NULL,
  type       TEXT NOT NULL,
  entity_id  TEXT,
  payload    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_type      ON dispatch_events (type);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_entity_id ON dispatch_events (entity_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_sequence  ON dispatch_events (sequence);

`;
