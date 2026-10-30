import type { InboxItem } from "../../shared/types";
import { visible } from "../access";
import type { SessionUser } from "../env";

// An inbox item is an update by someone else on a task the caller can see and
// owns or collaborates on, a comment that mentions the caller, or a change that
// took the caller off the task. An item is unread when it is newer than both
// the caller's last "read all" and their last read of that task.
export async function listInbox(
  db: D1Database,
  user: SessionUser,
): Promise<InboxItem[]> {
  const v = visible(user);
  const { results } = await db
    .prepare(
      `SELECT up.id, up.kind, up.body, up.meta, up.created_at, up.author_id, a.name AS author_name,
         tm.key || '-' || t.number AS task_key, t.title AS task_title,
         up.created_at > MAX(me.inbox_read_at, COALESCE(ir.read_at, '')) AS unread,
         EXISTS (SELECT 1 FROM json_each(json_extract(up.meta, '$.mentions')) j WHERE j.value = me.id) AS mentioned
       FROM task_updates up
       JOIN tasks t ON t.id = up.task_id JOIN teams tm ON tm.id = t.team_id
       JOIN users me ON me.id = ?
       LEFT JOIN inbox_reads ir ON ir.user_id = me.id AND ir.task_id = t.id
       LEFT JOIN users a ON a.id = up.author_id
       WHERE (up.author_id IS NULL OR up.author_id != me.id)
         AND (t.owner_id = me.id
           OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = me.id)
           OR EXISTS (SELECT 1 FROM json_each(json_extract(up.meta, '$.mentions')) j WHERE j.value = me.id)
           OR (up.kind = 'owner' AND json_extract(up.meta, '$.from') = me.id)
           OR (up.kind = 'collaborator' AND json_extract(up.meta, '$.removed') = me.id))
         AND ${v.sql} ORDER BY up.created_at DESC, up.rowid DESC LIMIT 200`,
    )
    .bind(user.id, ...v.params)
    .all<
      Omit<InboxItem, "meta" | "unread" | "mentioned"> & {
        meta: string;
        unread: number;
        mentioned: number;
      }
    >();
  return results.map((r) => ({
    ...r,
    meta: JSON.parse(r.meta),
    unread: r.unread === 1,
    mentioned: r.mentioned === 1,
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

export async function markTaskRead(
  db: D1Database,
  userId: string,
  taskId: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inbox_reads (user_id, task_id) VALUES (?, ?)
       ON CONFLICT (user_id, task_id) DO UPDATE SET read_at = excluded.read_at`,
    )
    .bind(userId, taskId)
    .run();
}
