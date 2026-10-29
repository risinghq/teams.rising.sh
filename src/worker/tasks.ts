import { Hono } from "hono";
import { progress, type TaskStatus as Status } from "../shared/progress";
import { teamRole, visible } from "./access";
import type { Env, User } from "./env";
import { body, date, HttpError, id, oneOf, text, type C } from "./http";
import { teamByKey } from "./teams";

const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
  "canceled",
] as const;

type TaskRow = {
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
  status: Status;
  visibility: "open" | "private";
  priority: number;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const SELECT = `SELECT t.*, tm.key AS team_key, o.name AS owner_name, o.avatar_url AS owner_avatar
  FROM tasks t JOIN teams tm ON tm.id = t.team_id LEFT JOIN users o ON o.id = t.owner_id`;

function parseKey(key: string): { team: string; number: number } {
  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(key);
  if (!match?.[1] || !match[2]) throw new HttpError(404, "tarea no encontrada");
  return { team: match[1].toUpperCase(), number: Number(match[2]) };
}

export async function taskByKey(c: C, key: string): Promise<TaskRow> {
  const { team, number } = parseKey(key);
  const v = visible(c.get("user"));
  const row = await c.env.DB.prepare(
    `${SELECT} WHERE tm.key = ? AND t.number = ? AND ${v.sql}`,
  )
    .bind(team, number, ...v.params)
    .first<TaskRow>();
  if (!row) throw new HttpError(404, "tarea no encontrada");
  return row;
}

type Label = { id: string; name: string; color: string };

// Adds key, owner, labels and progress to rows. Subtasks the caller cannot see
// do not count toward progress.
export async function hydrate(c: C, rows: TaskRow[]) {
  if (rows.length === 0) return [];
  const ids = JSON.stringify(rows.map((r) => r.id));
  const v = visible(c.get("user"), "s");
  const [labels, subs] = await Promise.all([
    c.env.DB.prepare(
      `SELECT tl.task_id, l.id, l.name, l.color FROM task_labels tl
       JOIN labels l ON l.id = tl.label_id WHERE tl.task_id IN (SELECT value FROM json_each(?))`,
    )
      .bind(ids)
      .all<Label & { task_id: string }>(),
    c.env.DB.prepare(
      `SELECT s.parent_id, s.status FROM tasks s
       WHERE s.parent_id IN (SELECT value FROM json_each(?)) AND ${v.sql}`,
    )
      .bind(ids, ...v.params)
      .all<{ parent_id: string; status: Status }>(),
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
      priority: r.priority,
      start_date: r.start_date,
      due_date: r.due_date,
      project_id: r.project_id,
      parent_id: r.parent_id,
      owner: r.owner_id
        ? { id: r.owner_id, name: r.owner_name, avatar_url: r.owner_avatar }
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

async function canEdit(c: C, task: TaskRow): Promise<boolean> {
  const user = c.get("user");
  if (task.owner_id === user.id || task.created_by === user.id) return true;
  if ((await teamRole(c, task.team_id)) === "leader") return true;
  const collab = await c.env.DB.prepare(
    "SELECT 1 AS yes FROM task_collaborators WHERE task_id = ? AND user_id = ?",
  )
    .bind(task.id, user.id)
    .first();
  return collab !== null;
}

function mentionIds(c: C, bodyText: string) {
  const names = [...bodyText.matchAll(/@([\w.-]+)/g)].map((m) =>
    (m[1] ?? "").toLowerCase(),
  );
  if (names.length === 0) return Promise.resolve([] as string[]);
  return c.env.DB.prepare(
    `SELECT id FROM users WHERE EXISTS (
       SELECT 1 FROM json_each(?) j WHERE lower(users.email) LIKE j.value || '@%'
         OR lower(replace(users.name, ' ', '')) = j.value)`,
  )
    .bind(JSON.stringify(names))
    .all<{ id: string }>()
    .then((r) => r.results.map((u) => u.id));
}

export const taskRoutes = new Hono<Env>();

taskRoutes.get("/tasks", async (c) => {
  const user = c.get("user");
  const q = c.req.query();
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
      JSON.stringify(q.status.split(",")),
    );
  } else if (q.open === "1") add("t.status NOT IN ('done', 'canceled')");
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
  const { results } = await c.env.DB.prepare(
    `${SELECT} WHERE ${where.join(" AND ")}
     ORDER BY t.due_date IS NULL, t.due_date, t.priority DESC, t.updated_at DESC LIMIT 500`,
  )
    .bind(...params)
    .all<TaskRow>();
  return c.json(await hydrate(c, results));
});

taskRoutes.post("/tasks", async (c) => {
  const user = c.get("user");
  const input = await body(c);
  const team = await teamByKey(c, text(input.team, "team", 6));
  const taskId = id();
  const parent = input.parent
    ? await taskByKey(c, text(input.parent, "parent", 20))
    : null;
  const labels = Array.isArray(input.labels) ? (input.labels as string[]) : [];
  const visibility = oneOf(
    input.visibility ?? "open",
    ["open", "private"],
    "visibility",
  );
  const status = oneOf(input.status ?? "todo", STATUSES, "status");
  const priority = Number(input.priority ?? 0);
  if (!Number.isInteger(priority) || priority < 0 || priority > 3) {
    throw new HttpError(400, "la prioridad debe ser de 0 a 3");
  }
  const owner =
    input.owner_id === undefined ? user.id : (input.owner_id as string | null);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO tasks (id, team_id, number, project_id, parent_id, title, description, owner_id,
         status, visibility, priority, start_date, due_date, created_by)
       VALUES (?, ?, (SELECT COALESCE(MAX(number), 0) + 1 FROM tasks WHERE team_id = ?),
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      taskId,
      team.id,
      team.id,
      (input.project_id as string | undefined) ?? null,
      parent?.id ?? null,
      text(input.title, "title", 300),
      typeof input.description === "string" ? input.description : "",
      owner,
      status,
      visibility,
      priority,
      date(input.start_date ?? null, "start_date"),
      date(input.due_date ?? null, "due_date"),
      user.id,
    ),
    ...labels.map((labelId) =>
      c.env.DB.prepare(
        "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)",
      ).bind(taskId, labelId),
    ),
  ]);
  const row = await c.env.DB.prepare(`${SELECT} WHERE t.id = ?`)
    .bind(taskId)
    .first<TaskRow>();
  return c.json((await hydrate(c, [row as TaskRow]))[0], 201);
});

taskRoutes.get("/tasks/:key", async (c) => {
  const row = await taskByKey(c, c.req.param("key"));
  const v = visible(c.get("user"), "s");
  const [task] = await hydrate(c, [row]);
  const [subtasks, collaborators, links, updates] = await Promise.all([
    c.env.DB.prepare(
      `${SELECT.replace(/\bt\b/g, "s")} WHERE s.parent_id = ? AND ${v.sql} ORDER BY s.number`,
    )
      .bind(row.id, ...v.params)
      .all<TaskRow>(),
    c.env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url FROM task_collaborators tc
       JOIN users u ON u.id = tc.user_id WHERE tc.task_id = ? ORDER BY u.name`,
    )
      .bind(row.id)
      .all(),
    c.env.DB.prepare("SELECT * FROM task_links WHERE task_id = ?")
      .bind(row.id)
      .all(),
    c.env.DB.prepare(
      `SELECT up.id, up.kind, up.body, up.meta, up.created_at, up.author_id,
         a.name AS author_name, a.avatar_url AS author_avatar
       FROM task_updates up LEFT JOIN users a ON a.id = up.author_id
       WHERE up.task_id = ? ORDER BY up.created_at, up.rowid`,
    )
      .bind(row.id)
      .all<{ meta: string }>(),
  ]);
  return c.json({
    ...task,
    project_id: row.project_id,
    subtasks: await hydrate(c, subtasks.results),
    collaborators: collaborators.results,
    links: links.results,
    updates: updates.results.map((u) => ({ ...u, meta: JSON.parse(u.meta) })),
  });
});

taskRoutes.patch("/tasks/:key", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  if (!(await canEdit(c, task)))
    throw new HttpError(
      403,
      "solo el responsable, un colaborador o un líder puede editar",
    );
  const input = await body(c);
  const sets: string[] = [];
  const params: unknown[] = [];
  const updates: { kind: string; meta: Record<string, unknown> }[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };
  if (input.title !== undefined) set("title", text(input.title, "title", 300));
  if (input.description !== undefined)
    set("description", String(input.description));
  if (input.visibility !== undefined)
    set(
      "visibility",
      oneOf(input.visibility, ["open", "private"], "visibility"),
    );
  if (input.priority !== undefined) {
    const priority = Number(input.priority);
    if (!Number.isInteger(priority) || priority < 0 || priority > 3)
      throw new HttpError(400, "la prioridad debe ser de 0 a 3");
    set("priority", priority);
  }
  if (input.project_id !== undefined) set("project_id", input.project_id);
  if (input.status !== undefined) {
    const status = oneOf(input.status, STATUSES, "status");
    if (status !== task.status) {
      set("status", status);
      updates.push({ kind: "status", meta: { from: task.status, to: status } });
    }
  }
  if (input.owner_id !== undefined && input.owner_id !== task.owner_id) {
    set("owner_id", input.owner_id);
    updates.push({
      kind: "owner",
      meta: { from: task.owner_id, to: input.owner_id },
    });
  }
  if (input.due_date !== undefined) {
    const due = date(input.due_date, "due_date");
    if (due !== task.due_date) {
      set("due_date", due);
      updates.push({ kind: "due", meta: { from: task.due_date, to: due } });
    }
  }
  if (input.start_date !== undefined)
    set("start_date", date(input.start_date, "start_date"));
  const statements = [];
  if (Array.isArray(input.labels)) {
    statements.push(
      c.env.DB.prepare("DELETE FROM task_labels WHERE task_id = ?").bind(
        task.id,
      ),
    );
    for (const labelId of input.labels as string[]) {
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)",
        ).bind(task.id, labelId),
      );
    }
  }
  if (sets.length > 0 || statements.length > 0) {
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    statements.unshift(
      c.env.DB.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).bind(
        ...params,
        task.id,
      ),
    );
  }
  for (const u of updates) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO task_updates (id, task_id, author_id, kind, meta) VALUES (?, ?, ?, ?, ?)",
      ).bind(id(), task.id, user.id, u.kind, JSON.stringify(u.meta)),
    );
  }
  if (statements.length > 0) await c.env.DB.batch(statements);
  return c.json(
    (await hydrate(c, [await taskByKey(c, c.req.param("key"))]))[0],
  );
});

taskRoutes.post("/tasks/:key/updates", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const input = await body(c);
  const comment = text(input.body, "body", 10000);
  const mentions = await mentionIds(c, comment);
  const updateId = id();
  await c.env.DB.prepare(
    "INSERT INTO task_updates (id, task_id, author_id, kind, body, meta) VALUES (?, ?, ?, 'comment', ?, ?)",
  )
    .bind(updateId, task.id, user.id, comment, JSON.stringify({ mentions }))
    .run();
  return c.json({ id: updateId }, 201);
});

taskRoutes.put("/tasks/:key/collaborators/:userId", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const target =
    c.req.param("userId") === "me" ? user.id : c.req.param("userId");
  const joinsSelf = target === user.id && task.visibility === "open";
  if (!joinsSelf && !(await canEdit(c, task)))
    throw new HttpError(
      403,
      "solo el responsable o un líder puede agregar a otras personas",
    );
  try {
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO task_collaborators (task_id, user_id) VALUES (?, ?)",
    )
      .bind(task.id, target)
      .run();
  } catch {
    throw new HttpError(404, "usuario no encontrado");
  }
  return c.json({ ok: true });
});

taskRoutes.delete("/tasks/:key/collaborators/:userId", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const target =
    c.req.param("userId") === "me" ? user.id : c.req.param("userId");
  if (target !== user.id && !(await canEdit(c, task)))
    throw new HttpError(403, "no permitido");
  await c.env.DB.prepare(
    "DELETE FROM task_collaborators WHERE task_id = ? AND user_id = ?",
  )
    .bind(task.id, target)
    .run();
  return c.json({ ok: true });
});

export type { User };
