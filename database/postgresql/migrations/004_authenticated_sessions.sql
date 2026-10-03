-- Existing seed/legacy users receive no credentials and cannot be claimed through registration.
-- Fail if legacy case-insensitive duplicates exist; an operator must resolve them explicitly.
CREATE UNIQUE INDEX users_email_normalized_unique ON users (lower(email));
CREATE TABLE user_credentials (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);
CREATE TABLE auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
