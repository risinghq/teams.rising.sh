import type { Me, User } from "../../shared/types";

export async function listUsers(db: D1Database): Promise<User[]> {
  const { results } = await db
    .prepare(
      "SELECT id, email, name, avatar_url, kind FROM users ORDER BY name",
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

// False when another user already holds the number.
export async function setWhatsappNumber(
  db: D1Database,
  userId: string,
  number: string | null,
): Promise<boolean> {
  try {
    await db
      .prepare("UPDATE users SET whatsapp_number = ? WHERE id = ?")
      .bind(number, userId)
      .run();
    return true;
  } catch {
    return false;
  }
}
