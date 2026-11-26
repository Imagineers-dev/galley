-- Every record the book keeps. Nothing is updated or deleted: a change is a new record.
CREATE TABLE IF NOT EXISTS records (
  book      LowCardinality(String),
  id        String,
  kind      LowCardinality(String),
  at        DateTime64(3, 'UTC'),
  by        String,
  replaces  Nullable(String),
  body      String
) ENGINE = MergeTree ORDER BY (book, id, at)
