-- Learning foundation migration for existing ECG Edu PostgreSQL installations.
-- Safe to run once; columns are added idempotently where PostgreSQL supports it.

ALTER TABLE clinical_cases
  ADD COLUMN IF NOT EXISTS ecg_image_kind TEXT NOT NULL DEFAULT 'schematic',
  ADD COLUMN IF NOT EXISTS image_source TEXT,
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS competencies TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS differential_diagnoses TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interpretation JSONB,
  ADD COLUMN IF NOT EXISTS clinical_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reviewed_at DATE;

ALTER TABLE training_attempts
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES clinical_cases(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS competency_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ;

UPDATE training_attempts ta
SET case_id = q.case_id
FROM live_questions q
WHERE ta.question_id = q.id
  AND ta.case_id IS NULL;

UPDATE training_attempts
SET next_review_at = created_at + INTERVAL '1 day'
WHERE next_review_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_training_attempts_user_created ON training_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_attempts_user_review ON training_attempts(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_status_level ON clinical_cases(status, level);

-- Publication enforcement is performed in the application until every legacy
-- published case has at least one verified clinical reference.
