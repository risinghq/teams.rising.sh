import type { SessionUser } from "../env";
import { PROFILE_COLUMNS } from "../users/queries";

export function userBySession(db: D1Database, session: string) {
  return db
    .prepare(
      `SELECT ${PROFILE_COLUMNS} FROM sessions s
       JOIN users ON users.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(session, new Date().toISOString())
    .first<SessionUser>();
}

export async function insertSession(
  db: D1Database,
  sessionId: string,
  userId: string,
  expiresAt: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run();
}

export async function deleteSession(
  db: D1Database,
  sessionId: string,
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

// The first human to sign in becomes an admin. The profile owns name and
// picture after the first sign-in; a later one only fills a missing picture.
export async function upsertUser(
  db: D1Database,
  newId: string,
  email: string,
  name: string,
  avatar: string | null,
): Promise<string> {
  const existing = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        "UPDATE users SET avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
      )
      .bind(avatar, existing.id)
      .run();
    return existing.id;
  }
  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar_url, is_admin)
       VALUES (?, ?, ?, ?, NOT EXISTS (SELECT 1 FROM users WHERE kind = 'human'))`,
    )
    .bind(newId, email, name, avatar)
    .run();
  return newId;
}

export async function saveRefreshToken(
  db: D1Database,
  userId: string,
  token: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO google_tokens (user_id, refresh_token) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET refresh_token = excluded.refresh_token,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(userId, token)
    .run();
}

export async function refreshTokenOf(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT refresh_token FROM google_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ refresh_token: string }>();
  return row?.refresh_token ?? null;
}
