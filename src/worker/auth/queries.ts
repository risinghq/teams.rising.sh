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
  scope: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO google_tokens (user_id, refresh_token, scope) VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET refresh_token = excluded.refresh_token,
       scope = excluded.scope,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(userId, token, scope)
    .run();
}

// The space-separated scopes of the stored grant: undefined when the person
// has no Google token, null for a grant stored before scopes were recorded.
export async function grantedScopeOf(
  db: D1Database,
  userId: string,
): Promise<string | null | undefined> {
  const row = await db
    .prepare("SELECT scope FROM google_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ scope: string | null }>();
  return row ? row.scope : undefined;
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

export async function teamsCalendarOf(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT calendar_id FROM google_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ calendar_id: string | null }>();
  return row?.calendar_id ?? null;
}

export async function saveTeamsCalendar(
  db: D1Database,
  userId: string,
  calendarId: string | null,
): Promise<void> {
  await db
    .prepare("UPDATE google_tokens SET calendar_id = ? WHERE user_id = ?")
    .bind(calendarId, userId)
    .run();
}
