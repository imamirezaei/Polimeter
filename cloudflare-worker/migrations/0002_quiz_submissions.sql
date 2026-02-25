CREATE TABLE IF NOT EXISTS quiz_submissions (
  submission_id TEXT PRIMARY KEY,
  quiz_version TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  answers_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_submission_answers (
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_side TEXT NOT NULL CHECK(selected_side IN ('left', 'right', 'neutral')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (submission_id, question_id),
  FOREIGN KEY (submission_id) REFERENCES quiz_submissions(submission_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_created_at
  ON quiz_submissions (created_at);

CREATE INDEX IF NOT EXISTS idx_quiz_submission_answers_question_id
  ON quiz_submission_answers (question_id);
