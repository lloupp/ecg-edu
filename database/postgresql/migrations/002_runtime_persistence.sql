-- Incremental only: preserve all users, questions and attempts.
ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE training_attempts ADD COLUMN IF NOT EXISTS explanation_snapshot TEXT;

UPDATE training_attempts ta
SET explanation_snapshot = c.explanation
FROM clinical_cases c
WHERE c.id = ta.case_id AND ta.explanation_snapshot IS NULL;

-- Legacy backfill uses the current explanation, since historical versions did not exist.
UPDATE training_attempts SET explanation_snapshot = '' WHERE explanation_snapshot IS NULL;
ALTER TABLE training_attempts ALTER COLUMN explanation_snapshot SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_active ON clinical_cases(status, created_at DESC) WHERE archived_at IS NULL;
