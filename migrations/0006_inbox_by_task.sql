-- The timeline records who was added to or removed from a task, so the person
-- added hears about it. SQLite changes a CHECK only by rebuilding the table.
CREATE TABLE task_updates_new (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'status', 'owner', 'due', 'progress', 'link', 'whatsapp', 'collaborator')),
  body TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- Rowid order breaks ties between updates written in one batch.
INSERT INTO task_updates_new (id, task_id, author_id, kind, body, meta, created_at)
  SELECT id, task_id, author_id, kind, body, meta, created_at FROM task_updates ORDER BY rowid;
DROP TABLE task_updates;
ALTER TABLE task_updates_new RENAME TO task_updates;
CREATE INDEX task_updates_task ON task_updates(task_id, created_at);

-- Updates on a task newer than read_at, and newer than users.inbox_read_at,
-- are unread for that user.
CREATE TABLE inbox_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, task_id)
);
