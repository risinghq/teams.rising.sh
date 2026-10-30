import type { InboxItem } from "../../shared/types";
import { visible } from "../access";
import type { SessionUser } from "../env";

// An inbox item is a timeline update by someone else on a task the caller owns
// or collaborates on, or a comment that mentions the caller. The caller must
// also be able to see the task.
export async function listInbox(
  db: D1Database,
  user: SessionUser,
): Promise<InboxItem[]> {
  const v = visible(user);
  const { results } = await db
    .prepare(
      `SELECT up.id, up.kind, up.body, up.meta, up.created_at, a.name AS author_name,
         tm.key || '-' || t.number AS task_key, t.title AS task_title,
         up.created_at > (SELECT inbox_read_at FROM users WHERE id = ?) AS unread
       FROM task_updates up
       JOIN tasks t ON t.id = up.task_id JOIN teams tm ON tm.id = t.team_id
       LEFT JOIN users a ON a.id = up.author_id
       WHERE (up.author_id IS NULL OR up.author_id != ?)
         AND (t.owner_id = ?
           OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = ?)
           OR EXISTS (SELECT 1 FROM json_each(json_extract(up.meta, '$.mentions')) j WHERE j.value = ?))
         AND ${v.sql} ORDER BY up.created_at DESC LIMIT 100`,
    )
    .bind(user.id, user.id, user.id, user.id, user.id, ...v.params)
    .all<
      Omit<InboxItem, "meta" | "unread"> & { meta: string; unread: number }
    >();
  return results.map((r) => ({
    ...r,
    meta: JSON.parse(r.meta),
    unread: r.unread === 1,
  }));
}

export async function markInboxRead(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET inbox_read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(userId)
    .run();
}
