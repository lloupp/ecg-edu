CREATE TYPE user_role AS ENUM ('student', 'teacher');
CREATE TYPE case_level AS ENUM ('basic', 'intermediate', 'advanced');
CREATE TYPE case_status AS ENUM ('published', 'pending_review');
CREATE TYPE session_status AS ENUM ('lobby', 'active', 'finished');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  institution TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clinical_cases (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  ecg_image_url TEXT NOT NULL,
  ecg_image_kind TEXT NOT NULL DEFAULT 'schematic' CHECK (ecg_image_kind IN ('schematic', 'deidentified_clinical')),
  image_source TEXT,
  clinical_description TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  explanation TEXT NOT NULL,
  level case_level NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  competencies TEXT[] NOT NULL DEFAULT '{}',
  differential_diagnoses TEXT[] NOT NULL DEFAULT '{}',
  interpretation JSONB,
  clinical_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  status case_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_reviewed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'published' OR jsonb_array_length(clinical_references) > 0)
);

CREATE TABLE live_questions (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL
);

CREATE TABLE live_sessions (
  id UUID PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status session_status NOT NULL DEFAULT 'lobby',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE session_participants (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  score INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE session_answers (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE training_attempts (
  id UUID PRIMARY KEY,
  attempt_order BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
  explanation_snapshot TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  competency_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_training_attempts_user_created ON training_attempts(user_id, created_at DESC);
CREATE INDEX idx_training_attempts_user_review ON training_attempts(user_id, next_review_at);
CREATE INDEX idx_clinical_cases_status_level ON clinical_cases(status, level);
