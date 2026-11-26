-- The by-kind copy of the records is dropped: every read names one book, and listing the books takes ~10 ms among a
-- million records without it (tests/scale.test.ts), so a second full copy of every record is not worth keeping.
-- The two migrations that added it were removed; this removes it from a database that still has it.
ALTER TABLE records DROP PROJECTION IF EXISTS by_kind
