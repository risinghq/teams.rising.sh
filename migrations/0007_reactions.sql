-- One row per person, update and emoji, so reacting twice with the same emoji
-- is one reaction and taking it back deletes the row.
CREATE TABLE update_reactions (
  update_id TEXT NOT NULL REFERENCES task_updates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (update_id, user_id, emoji)
);
