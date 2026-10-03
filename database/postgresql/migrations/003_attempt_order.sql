-- Deterministic insertion order when multiple attempts share a timestamp.
-- Legacy tied timestamps did not contain enough information to recover the original order.
ALTER TABLE training_attempts ADD COLUMN IF NOT EXISTS attempt_order BIGINT GENERATED ALWAYS AS IDENTITY;
