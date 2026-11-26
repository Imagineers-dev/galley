-- The bytes of the files attached to a book (slides, research, images, video), kept apart from the records so reading
-- a book never loads them. A file is named by the SHA-256 of its bytes, so the same file attached twice is kept once,
-- and is cut into chunks of 1 MiB (n from 0), so a video can be served a range at a time. Each chunk is base64,
-- because a ClickHouse JSON insert carries text.
CREATE TABLE IF NOT EXISTS files (
  book  LowCardinality(String),
  hash  String,
  n     UInt32,
  data  String,
  at    DateTime64(3, 'UTC')
) ENGINE = ReplacingMergeTree ORDER BY (book, hash, n)
