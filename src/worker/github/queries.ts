import { splitKey, type LinkSpec } from "./events";

// The webhook is not a user, so no visibility rule applies.
export async function taskIdByKey(
  db: D1Database,
  key: string,
): Promise<string | null> {
  const { team, number } = splitKey(key);
  const row = await db
    .prepare(
      `SELECT t.id FROM tasks t JOIN teams tm ON tm.id = t.team_id
       WHERE tm.key = ? AND t.number = ?`,
    )
    .bind(team, number)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function linkState(
  db: D1Database,
  spec: LinkSpec,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT state FROM task_links
       WHERE provider = 'github' AND repo = ? AND kind = ? AND external_id = ?`,
    )
    .bind(spec.repo, spec.kind, spec.externalId)
    .first<{ state: string }>();
  return row?.state ?? null;
}

export async function upsertLink(
  db: D1Database,
  linkId: string,
  taskId: string,
  spec: LinkSpec,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO task_links (id, task_id, kind, repo, external_id, url, title, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (provider, repo, kind, external_id)
       DO UPDATE SET url = excluded.url, title = excluded.title, state = excluded.state`,
    )
    .bind(
      linkId,
      taskId,
      spec.kind,
      spec.repo,
      spec.externalId,
      spec.url,
      spec.title,
      spec.state,
    )
    .run();
}

export async function insertLinkUpdate(
  db: D1Database,
  updateId: string,
  taskId: string,
  body: string,
  meta: Record<string, string>,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO task_updates (id, task_id, kind, body, meta) VALUES (?, ?, 'link', ?, ?)",
    )
    .bind(updateId, taskId, body, JSON.stringify(meta))
    .run();
}
