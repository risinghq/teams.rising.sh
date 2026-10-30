import type { SessionUser } from "../env";

export function userByNumber(db: D1Database, number: string) {
  return db
    .prepare(
      "SELECT id, email, name, avatar_url, is_admin FROM users WHERE whatsapp_number = ?",
    )
    .bind(number)
    .first<SessionUser>();
}

export async function messageSeen(
  db: D1Database,
  waId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 FROM task_updates WHERE kind = 'whatsapp' AND json_extract(meta, '$.wa_id') = ?",
    )
    .bind(waId)
    .first();
  return row !== null;
}

export async function insertWhatsappUpdate(
  db: D1Database,
  updateId: string,
  taskId: string,
  authorId: string,
  body: string,
  waId: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO task_updates (id, task_id, author_id, kind, body, meta) VALUES (?, ?, ?, 'whatsapp', ?, ?)",
    )
    .bind(updateId, taskId, authorId, body, JSON.stringify({ wa_id: waId }))
    .run();
}
