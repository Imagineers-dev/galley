-- The editor's sign-ins. The cookie holds a random token; only its hash and expiry are kept. Signing out (or
-- revoking every sign-in) is a new row.
CREATE TABLE IF NOT EXISTS sessions (
  hash     String,
  expires  DateTime64(3, 'UTC'),
  revoked  UInt8,
  at       DateTime64(3, 'UTC')
) ENGINE = MergeTree ORDER BY (hash, at)
