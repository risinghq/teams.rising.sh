-- Refresh tokens for Google Calendar sync. One row per user.
CREATE TABLE google_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Updates newer than this are unread in the inbox.
ALTER TABLE users ADD COLUMN inbox_read_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
