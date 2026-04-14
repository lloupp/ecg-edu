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
  title TEXT NOT NULL,
  ecg_image_url TEXT NOT NULL,
  clinical_description TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  explanation TEXT NOT NULL,
  level case_level NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  status case_status NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
