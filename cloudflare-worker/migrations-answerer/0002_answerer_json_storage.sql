BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS answerer_submissions (
  answerer_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  submission_json TEXT NOT NULL CHECK (json_valid(submission_json))
);

INSERT OR IGNORE INTO answerer_submissions (
  answerer_id,
  created_at,
  submission_json
)
SELECT
  s.answerer_id,
  s.created_at,
  json_object(
    'consent_to_store_answers', json('true'),
    'quiz_version', s.quiz_version,
    'started_at', s.started_at,
    'completed_at', s.completed_at,
    'answers', COALESCE(
      (
        SELECT json('[' || group_concat(answer_json, ',') || ']')
        FROM (
          SELECT json_object(
            'question_id', a.question_id,
            'selected_side', a.selected_side,
            'correct_side', a.correct_side,
            'is_correct', CASE
              WHEN a.is_correct = 1 THEN json('true')
              ELSE json('false')
            END,
            'question_axis', a.question_axis,
            'question_axis_title', a.question_axis_title
          ) AS answer_json
          FROM answerer_answers a
          WHERE a.answerer_id = s.answerer_id
          ORDER BY a.created_at, a.question_id
        )
      ),
      json('[]')
    )
  ) AS submission_json
FROM answerer_sessions s;

DROP INDEX IF EXISTS idx_answerer_answers_axis;
DROP INDEX IF EXISTS idx_answerer_answers_created_at;
DROP INDEX IF EXISTS idx_answerer_sessions_created_at;

DROP TABLE IF EXISTS answerer_answers;
DROP TABLE IF EXISTS answerer_sessions;

CREATE INDEX IF NOT EXISTS idx_answerer_submissions_created_at
  ON answerer_submissions (created_at);

COMMIT;
