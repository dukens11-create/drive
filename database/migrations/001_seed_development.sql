CREATE TABLE IF NOT EXISTS drive.seed_metadata (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

INSERT INTO drive.seed_metadata (key, value)
VALUES ('environment', 'development')
ON CONFLICT (key) DO NOTHING;

INSERT INTO drive.migrations (name)
VALUES ('001_seed_development')
ON CONFLICT (name) DO NOTHING;
