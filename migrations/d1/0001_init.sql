-- llmdeepdive — initial schema
--
-- PRIVACY INVARIANT, enforced by the shape of these tables rather than by policy:
-- there is no column anywhere that can hold free text written by a learner.
-- Teach-back prose stays in localStorage and never leaves the browser. If a
-- future migration adds a TEXT column intended for learner writing, that is a
-- breach of the stated promise, not a feature.
--
-- Identity is an opaque client-generated token. No email, no name, no IP, no
-- user agent, no join key to anything outside this database.
--
-- Soft delete only: every table carries deleted_at and every read filters it.

CREATE TABLE IF NOT EXISTS learners (
  -- Client-generated opaque id (UUIDv4). Never derived from anything personal.
  token       TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  -- 'en' | 'pt-br'. Stored only to report aggregate reach per language.
  locale      TEXT NOT NULL CHECK (locale IN ('en', 'pt-br')),
  deleted_at  INTEGER
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  token       TEXT NOT NULL,
  lesson_id   TEXT NOT NULL,
  -- Booleans, not content. Whether the teach-back met the length gate — never
  -- what it said.
  teachback_ok INTEGER NOT NULL DEFAULT 0 CHECK (teachback_ok IN (0, 1)),
  quiz_ok      INTEGER NOT NULL DEFAULT 0 CHECK (quiz_ok IN (0, 1)),
  completed_at INTEGER,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  PRIMARY KEY (token, lesson_id),
  FOREIGN KEY (token) REFERENCES learners(token)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL,
  lesson_id   TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  -- Which option was chosen, not why. Used only to find questions that are
  -- badly worded, by looking at aggregate wrong-answer distribution.
  chosen_index INTEGER NOT NULL,
  correct      INTEGER NOT NULL CHECK (correct IN (0, 1)),
  created_at   INTEGER NOT NULL,
  deleted_at   INTEGER,
  FOREIGN KEY (token) REFERENCES learners(token)
);

-- Lesson-level signal, deliberately reduced to an enum so it cannot become a
-- free-text feedback channel.
CREATE TABLE IF NOT EXISTS lesson_signal (
  token       TEXT NOT NULL,
  lesson_id   TEXT NOT NULL,
  signal      TEXT NOT NULL CHECK (signal IN ('too_easy', 'about_right', 'too_hard', 'unclear')),
  created_at  INTEGER NOT NULL,
  deleted_at  INTEGER,
  PRIMARY KEY (token, lesson_id),
  FOREIGN KEY (token) REFERENCES learners(token)
);

-- Every read path filters deleted_at, so the indexes include it.
CREATE INDEX IF NOT EXISTS idx_progress_token  ON lesson_progress (token, deleted_at);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress (lesson_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_lesson ON quiz_attempts (lesson_id, question_index, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_token  ON quiz_attempts (token, deleted_at);
CREATE INDEX IF NOT EXISTS idx_signal_lesson   ON lesson_signal (lesson_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_learners_seen   ON learners (last_seen_at, deleted_at);
