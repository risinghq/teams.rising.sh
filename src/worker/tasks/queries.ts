import { progress } from "../../shared/progress";
import type { PatchTask, TaskQuery } from "../../shared/schemas";
import type {
  Label,
  Person,
  Reaction,
  Task,
  TaskLink,
  TaskStatus,
  Update,
} from "../../shared/types";
import { visible } from "../access";
import { EMAIL_LOCAL_PART } from "../users/queries";
import type { SessionUser } from "../env";
import { id } from "../http";
import { after, cursorOf, ORDER_BY } from "./page";

export type TaskRow = {
  id: string;
  team_id: string;
  team_key: string;
  number: number;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_avatar: string | null;
  status: TaskStatus;
  visibility: "open" | "private";
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const taskSelect = (t = "t") =>
  `SELECT ${t}.*, tm.key AS team_key, o.name AS owner_name, o.avatar_url AS owner_avatar
   FROM tasks ${t} JOIN teams tm ON tm.id = ${t}.team_id LEFT JOIN users o ON o.id = ${t}.owner_id`;

export function findVisibleTask(
  db: D1Database,
  user: SessionUser,
  teamKey: string,
  number: number,
) {
  const v = visible(user);
  return db
    .prepare(`${taskSelect()} WHERE tm.key = ? AND t.number = ? AND ${v.sql}`)
    .bind(teamKey, number, ...v.params)
    .first<TaskRow>();
}

export function taskById(db: D1Database, taskId: string) {
  return db
    .prepare(`${taskSelect()} WHERE t.id = ?`)
    .bind(taskId)
    .first<TaskRow>();
}

// One page of the tasks `user` may see, in list order. `next` is the cursor of
// the following page, or null on the last one.
export async function listTasks(
  db: D1Database,
  user: SessionUser,
  q: TaskQuery,
): Promise<{ rows: TaskRow[]; next: string | null }> {
  const v = visible(user);
  const where: string[] = [v.sql];
  const params: unknown[] = [...v.params];
  const add = (sql: string, ...values: unknown[]) => {
    where.push(sql);
    params.push(...values);
  };
  if (q.team) add("tm.key = ?", q.team.toUpperCase());
  if (q.owner === "me") add("t.owner_id = ?", user.id);
  else if (q.owner === "none") add("t.owner_id IS NULL");
  else if (q.owner) add("t.owner_id = ?", q.owner);
  if (q.status) {
    add(
      "t.status IN (SELECT value FROM json_each(?))",
      JSON.stringify(q.status),
    );
  }
  if (q.open === "1") add("t.status NOT IN ('done', 'canceled')");
  if (q.project) add("t.project_id = ?", q.project);
  if (q.label) {
    add(
      `EXISTS (SELECT 1 FROM task_labels tl JOIN labels l ON l.id = tl.label_id
        WHERE tl.task_id = t.id AND (l.id = ? OR l.name = ?))`,
      q.label,
      q.label,
    );
  }
  if (q.due_before) add("t.due_date <= ?", q.due_before);
  if (q.due_after) add("t.due_date >= ?", q.due_after);
  if (q.collaborator === "me") {
    add(
      "EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = ?)",
      user.id,
    );
  }
  if (q.top === "1") add("t.parent_id IS NULL");
  if (q.q) {
    const like = `%${q.q.replace(/[%_]/g, "")}%`;
    add("(t.title LIKE ? OR tm.key || '-' || t.number LIKE ?)", like, like);
  }
  if (q.cursor) {
    const position = after(q.cursor);
    add(position.sql, ...position.params);
  }
  const { results } = await db
    .prepare(
      `${taskSelect()} WHERE ${where.join(" AND ")} ORDER BY ${ORDER_BY} LIMIT ?`,
    )
    .bind(...params, q.limit + 1)
    .all<TaskRow>();
  const rows = results.slice(0, q.limit);
  const last = rows.at(-1);
  return {
    rows,
    next: results.length > q.limit && last ? cursorOf(last) : null,
  };
}

export async function calendarTasks(
  db: D1Database,
  user: SessionUser,
  from: string | null,
  to: string | null,
): Promise<TaskRow[]> {
  const v = visible(user);
  const { results } = await db
    .prepare(
      `${taskSelect()}
       WHERE (t.due_date IS NOT NULL OR t.start_date IS NOT NULL)
         AND (? IS NULL OR COALESCE(t.due_date, t.start_date) >= ?)
         AND (? IS NULL OR COALESCE(t.start_date, t.due_date) <= ?)
         AND ${v.sql} ORDER BY COALESCE(t.due_date, t.start_date) LIMIT 1000`,
    )
    .bind(from, from, to, to, ...v.params)
    .all<TaskRow>();
  return results;
}

// Subtasks the caller cannot see do not count toward progress.
export async function hydrate(
  db: D1Database,
  user: SessionUser,
  rows: TaskRow[],
): Promise<Task[]> {
  if (rows.length === 0) return [];
  const ids = JSON.stringify(rows.map((r) => r.id));
  const v = visible(user, "s");
  const [labels, subs] = await Promise.all([
    db
      .prepare(
        `SELECT tl.task_id, l.id, l.name, l.color FROM task_labels tl
         JOIN labels l ON l.id = tl.label_id WHERE tl.task_id IN (SELECT value FROM json_each(?))`,
      )
      .bind(ids)
      .all<Label & { task_id: string }>(),
    db
      .prepare(
        `SELECT s.parent_id, s.status FROM tasks s
         WHERE s.parent_id IN (SELECT value FROM json_each(?)) AND ${v.sql}`,
      )
      .bind(ids, ...v.params)
      .all<{ parent_id: string; status: TaskStatus }>(),
  ]);
  return rows.map((r) => {
    const children = subs.results.filter((s) => s.parent_id === r.id);
    return {
      id: r.id,
      key: `${r.team_key}-${r.number}`,
      team: r.team_key,
      number: r.number,
      title: r.title,
      description: r.description,
      status: r.status,
      visibility: r.visibility,
      start_date: r.start_date,
      due_date: r.due_date,
      project_id: r.project_id,
      parent_id: r.parent_id,
      owner: r.owner_id
        ? {
            id: r.owner_id,
            name: r.owner_name as string,
            avatar_url: r.owner_avatar,
          }
        : null,
      labels: labels.results
        .filter((l) => l.task_id === r.id)
        .map(({ task_id: _, ...l }) => l),
      progress: progress({ status: r.status }, children),
      subtask_count: children.length,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export async function subtasksOf(
  db: D1Database,
  user: SessionUser,
  parentId: string,
): Promise<TaskRow[]> {
  const v = visible(user, "s");
  const { results } = await db
    .prepare(
      `${taskSelect("s")} WHERE s.parent_id = ? AND ${v.sql} ORDER BY s.number`,
    )
    .bind(parentId, ...v.params)
    .all<TaskRow>();
  return results;
}

export async function collaboratorsOf(
  db: D1Database,
  taskId: string,
): Promise<Person[]> {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.name, u.avatar_url FROM task_collaborators tc
       JOIN users u ON u.id = tc.user_id WHERE tc.task_id = ? ORDER BY u.name`,
    )
    .bind(taskId)
    .all<Person>();
  return results;
}

export async function linksOf(
  db: D1Database,
  taskId: string,
): Promise<TaskLink[]> {
  const { results } = await db
    .prepare("SELECT * FROM task_links WHERE task_id = ?")
    .bind(taskId)
    .all<TaskLink>();
  return results;
}

export async function updatesOf(
  db: D1Database,
  taskId: string,
  viewerId: string,
): Promise<Update[]> {
  const [updates, reactions] = await db.batch([
    db
      .prepare(
        `SELECT up.id, up.kind, up.body, up.meta, up.created_at, up.author_id,
           a.name AS author_name, a.avatar_url AS author_avatar
         FROM task_updates up LEFT JOIN users a ON a.id = up.author_id
         WHERE up.task_id = ? ORDER BY up.created_at, up.rowid`,
      )
      .bind(taskId),
    db
      .prepare(
        `SELECT r.update_id, r.emoji, r.user_id, u.name
         FROM update_reactions r
         JOIN task_updates up ON up.id = r.update_id
         JOIN users u ON u.id = r.user_id
         WHERE up.task_id = ? ORDER BY r.created_at, r.rowid`,
      )
      .bind(taskId),
  ]);
  const byUpdate = new Map<string, Reaction[]>();
  for (const r of reactions!.results as {
    update_id: string;
    emoji: string;
    user_id: string;
    name: string;
  }[]) {
    const list = byUpdate.get(r.update_id) ?? [];
    let entry = list.find((x) => x.emoji === r.emoji);
    if (!entry) {
      entry = { emoji: r.emoji, names: [], mine: false };
      list.push(entry);
    }
    entry.names.push(r.name);
    entry.mine ||= r.user_id === viewerId;
    byUpdate.set(r.update_id, list);
  }
  return (
    updates!.results as (Omit<Update, "meta" | "reactions"> & {
      meta: string;
    })[]
  ).map((u) => ({
    ...u,
    meta: JSON.parse(u.meta),
    reactions: byUpdate.get(u.id) ?? [],
  }));
}

// False when the update is not on the task.
export async function setReaction(
  db: D1Database,
  taskId: string,
  updateId: string,
  userId: string,
  emoji: string,
  on: boolean,
): Promise<boolean> {
  const update = await db
    .prepare("SELECT 1 FROM task_updates WHERE id = ? AND task_id = ?")
    .bind(updateId, taskId)
    .first();
  if (!update) return false;
  await db
    .prepare(
      on
        ? "INSERT OR IGNORE INTO update_reactions (update_id, user_id, emoji) VALUES (?, ?, ?)"
        : "DELETE FROM update_reactions WHERE update_id = ? AND user_id = ? AND emoji = ?",
    )
    .bind(updateId, userId, emoji)
    .run();
  return true;
}

export async function isCollaborator(
  db: D1Database,
  taskId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS yes FROM task_collaborators WHERE task_id = ? AND user_id = ?",
    )
    .bind(taskId, userId)
    .first();
  return row !== null;
}

// The ids of the users that `@name` mentions name by email local part or by
// display name without spaces.
export async function mentionedUserIds(
  db: D1Database,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];
  const { results } = await db
    .prepare(
      `SELECT id FROM users WHERE EXISTS (
         SELECT 1 FROM json_each(?) j WHERE users.username = j.value
           OR ${EMAIL_LOCAL_PART} = j.value
           OR lower(replace(users.name, ' ', '')) = j.value)`,
    )
    .bind(JSON.stringify(names))
    .all<{ id: string }>();
  return results.map((u) => u.id);
}

export async function insertTask(
  db: D1Database,
  task: {
    id: string;
    team_id: string;
    project_id: string | null;
    parent_id: string | null;
    title: string;
    description: string;
    owner_id: string | null;
    status: TaskStatus;
    visibility: "open" | "private";
    start_date: string | null;
    due_date: string | null;
    created_by: string;
    labels: string[];
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (id, team_id, number, project_id, parent_id, title, description, owner_id,
           status, visibility, start_date, due_date, created_by)
         VALUES (?, ?, (SELECT COALESCE(MAX(number), 0) + 1 FROM tasks WHERE team_id = ?),
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        task.id,
        task.team_id,
        task.team_id,
        task.project_id,
        task.parent_id,
        task.title,
        task.description,
        task.owner_id,
        task.status,
        task.visibility,
        task.start_date,
        task.due_date,
        task.created_by,
      ),
    ...task.labels.map((labelId) =>
      db
        .prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)")
        .bind(task.id, labelId),
    ),
  ]);
}

// Applies the patch in one batch. A change of status, owner or due date also
// writes a timeline update by `actorId`.
export async function updateTask(
  db: D1Database,
  actorId: string,
  task: TaskRow,
  patch: PatchTask,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const timeline: { kind: string; meta: Record<string, unknown> }[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.title !== undefined) set("title", patch.title);
  if (patch.description !== undefined) set("description", patch.description);
  if (patch.visibility !== undefined) set("visibility", patch.visibility);
  if (patch.project_id !== undefined) set("project_id", patch.project_id);
  if (patch.status !== undefined && patch.status !== task.status) {
    set("status", patch.status);
    timeline.push({
      kind: "status",
      meta: { from: task.status, to: patch.status },
    });
  }
  if (patch.owner_id !== undefined && patch.owner_id !== task.owner_id) {
    set("owner_id", patch.owner_id);
    timeline.push({
      kind: "owner",
      meta: { from: task.owner_id, to: patch.owner_id },
    });
  }
  if (patch.due_date !== undefined && patch.due_date !== task.due_date) {
    set("due_date", patch.due_date);
    timeline.push({
      kind: "due",
      meta: { from: task.due_date, to: patch.due_date },
    });
  }
  if (patch.start_date !== undefined) set("start_date", patch.start_date);
  const statements: D1PreparedStatement[] = [];
  if (patch.labels) {
    statements.push(
      db.prepare("DELETE FROM task_labels WHERE task_id = ?").bind(task.id),
      ...patch.labels.map((labelId) =>
        db
          .prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)")
          .bind(task.id, labelId),
      ),
    );
  }
  if (sets.length > 0 || statements.length > 0) {
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    statements.unshift(
      db
        .prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...params, task.id),
    );
  }
  for (const u of timeline) {
    statements.push(
      db
        .prepare(
          "INSERT INTO task_updates (id, task_id, author_id, kind, meta) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id(), task.id, actorId, u.kind, JSON.stringify(u.meta)),
    );
  }
  if (statements.length > 0) await db.batch(statements);
}

export async function insertComment(
  db: D1Database,
  taskId: string,
  authorId: string,
  body: string,
  mentions: string[],
): Promise<string> {
  const updateId = id();
  await db
    .prepare(
      "INSERT INTO task_updates (id, task_id, author_id, kind, body, meta) VALUES (?, ?, ?, 'comment', ?, ?)",
    )
    .bind(updateId, taskId, authorId, body, JSON.stringify({ mentions }))
    .run();
  return updateId;
}

const collaboratorUpdate = (
  db: D1Database,
  taskId: string,
  actorId: string,
  meta: { added: string } | { removed: string },
) =>
  db
    .prepare(
      "INSERT INTO task_updates (id, task_id, author_id, kind, meta) VALUES (?, ?, ?, 'collaborator', ?)",
    )
    .bind(id(), taskId, actorId, JSON.stringify(meta));

// Adds the user and records who added them. False when the user does not
// exist.
export async function addCollaborator(
  db: D1Database,
  taskId: string,
  userId: string,
  actorId: string,
): Promise<boolean> {
  if (await isCollaborator(db, taskId, userId)) return true;
  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO task_collaborators (task_id, user_id) VALUES (?, ?)",
        )
        .bind(taskId, userId),
      collaboratorUpdate(db, taskId, actorId, { added: userId }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function removeCollaborator(
  db: D1Database,
  taskId: string,
  userId: string,
  actorId: string,
): Promise<void> {
  if (!(await isCollaborator(db, taskId, userId))) return;
  await db.batch([
    db
      .prepare(
        "DELETE FROM task_collaborators WHERE task_id = ? AND user_id = ?",
      )
      .bind(taskId, userId),
    collaboratorUpdate(db, taskId, actorId, { removed: userId }),
  ]);
}
