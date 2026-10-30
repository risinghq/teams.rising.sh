-- One row per one-time script that ran against this database (docs/scripts.md).
CREATE TABLE script_runs (
  name TEXT PRIMARY KEY,
  ran_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
