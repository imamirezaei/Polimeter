CREATE TABLE IF NOT EXISTS answerer_sessions (
  answerer_id TEXT PRIMARY KEY,
  quiz_version TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  answers_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answerer_answers (
  answerer_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_side TEXT NOT NULL CHECK(selected_side IN ('left', 'right', 'neutral')),
  correct_side TEXT CHECK(correct_side IN ('left', 'right', 'neutral')),
  is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
  question_axis TEXT,
  question_axis_title TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (answerer_id, question_id),
  FOREIGN KEY (answerer_id) REFERENCES answerer_sessions(answerer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_answerer_sessions_created_at
  ON answerer_sessions (created_at);

CREATE INDEX IF NOT EXISTS idx_answerer_answers_created_at
  ON answerer_answers (created_at);

CREATE INDEX IF NOT EXISTS idx_answerer_answers_axis
  ON answerer_answers (question_axis);
