-- Cloudflare D1 schema for the UntungLab licence server.
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  amount_sen    INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','paid')),
  bill_code     TEXT NOT NULL,
  license_code  TEXT,
  email_sent_at TEXT,
  created_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS orders_email ON orders (lower(email));

CREATE TABLE IF NOT EXISTS licenses (
  code       TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id),
  status     TEXT NOT NULL CHECK (status IN ('active','revoked')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  code         TEXT NOT NULL REFERENCES licenses (code),
  device_id    TEXT NOT NULL,
  label        TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  PRIMARY KEY (code, device_id)
);

CREATE TABLE IF NOT EXISTS failures (
  key TEXT NOT NULL,
  at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS failures_key_at ON failures (key, at);

-- Added with the admin insights (D-92). Additive: safe to run on a live database.
CREATE TABLE IF NOT EXISTS order_meta (
  order_id TEXT PRIMARY KEY REFERENCES orders (id),
  source   TEXT,
  note     TEXT
);

CREATE TABLE IF NOT EXISTS admin_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL
);
