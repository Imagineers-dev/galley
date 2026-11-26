-- Who may call the book without the editor's sign-in: a repository on this machine or an agent. Only a hash of each key
-- is kept, with the books it may write and whether it may start a book. A change (revoking) is a new row.
CREATE TABLE IF NOT EXISTS keys (
  hash       String,
  who        String,
  books      Array(String),
  may_start  UInt8,
  revoked    UInt8,
  at         DateTime64(3, 'UTC')
) ENGINE = MergeTree ORDER BY (hash, at)
