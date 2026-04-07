-- Run once if `enable_person_count` column is missing (e.g. TYPEORM_SYNCHRONIZE=false).
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS enable_person_count boolean NOT NULL DEFAULT false;
