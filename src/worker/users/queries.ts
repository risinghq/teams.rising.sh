import type { PatchMe } from "../../shared/schemas";
import type { Me, User } from "../../shared/types";
import type { SessionUser } from "../env";

// SQL for the lowercased part of `users.email` before the "@".
export const EMAIL_LOCAL_PART =
  "lower(substr(users.email, 1, instr(users.email, '@') - 1))";

export async function listUsers(db: D1Database): Promise<User[]> {
  const { results } = await db
    .prepare(
      "SELECT id, email, name, username, avatar_url, kind FROM users ORDER BY name",
    )
    .all<User>();
  return results;
}

export async function teamsOf(db: D1Database, userId: string) {
  const { results } = await db
    .prepare(
      `SELECT t.key, t.name, m.role FROM team_members m JOIN teams t ON t.id = m.team_id
       WHERE m.user_id = ? ORDER BY t.key`,
    )
    .bind(userId)
    .all<Me["teams"][number]>();
  return results;
}

export const PROFILE_COLUMNS = `users.id, users.email, users.name, users.username,
  users.avatar_url, users.whatsapp_number, users.whatsapp_verified_at, users.is_admin`;

export function profileOf(db: D1Database, userId: string) {
  return db
    .prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`)
    .bind(userId)
    .first<SessionUser>();
}

// A handle mentions one person, so it may not be another person's username or
// the local part of their email, which is their handle until they pick one.
export async function handleTaken(
  db: D1Database,
  userId: string,
  handle: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS taken FROM users WHERE id != ?1
         AND (username = ?2 OR ${EMAIL_LOCAL_PART} = ?2)`,
    )
    .bind(userId, handle)
    .first();
  return row !== null;
}

export async function numberTaken(
  db: D1Database,
  userId: string,
  number: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS taken FROM users WHERE id != ? AND whatsapp_number = ?",
    )
    .bind(userId, number)
    .first();
  return row !== null;
}

// A new number is unverified until its owner confirms it again.
export async function updateProfile(
  db: D1Database,
  userId: string,
  fields: Required<PatchMe>,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET name = ?, username = ?, avatar_url = ?,
         whatsapp_verified_at = CASE WHEN whatsapp_number IS ?4
           THEN whatsapp_verified_at END,
         whatsapp_number = ?4
       WHERE id = ?5`,
    )
    .bind(
      fields.name,
      fields.username,
      fields.avatar_url,
      fields.whatsapp_number,
      userId,
    )
    .run();
}
