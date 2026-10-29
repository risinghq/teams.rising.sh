import { Hono } from "hono";
import { visible } from "./access";
import type { Env, User } from "./env";
import { body, date, HttpError, id, text, type C } from "./http";
import { hydrate } from "./tasks";
import { normalizeNumber } from "./whatsapp";

type EventRow = {
  id: string;
  team_id: string | null;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  created_by: string;
};

function range(c: C) {
  const from = c.req.query("from") ? date(c.req.query("from"), "from") : null;
  const to = c.req.query("to") ? date(c.req.query("to"), "to") : null;
  return { from, to };
}

async function listEvents(c: C, from: string | null, to: string | null) {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM events WHERE (? IS NULL OR substr(starts_at, 1, 10) >= ?)
       AND (? IS NULL OR substr(starts_at, 1, 10) <= ?) ORDER BY starts_at`,
  )
    .bind(from, from, to, to)
    .all<EventRow>();
  return results;
}

async function eventById(c: C, eventId: string): Promise<EventRow> {
  const row = await c.env.DB.prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first<EventRow>();
  if (!row) throw new HttpError(404, "event not found");
  return row;
}

async function requireEventEditor(c: C, event: EventRow): Promise<void> {
  const user = c.get("user");
  if (user.is_admin || event.created_by === user.id) return;
  if (event.team_id) {
    const leader = await c.env.DB.prepare(
      "SELECT 1 AS yes FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'leader'",
    )
      .bind(event.team_id, user.id)
      .first();
    if (leader) return;
  }
  throw new HttpError(
    403,
    "only the creator or a leader can change this event",
  );
}

async function teamIdByKey(c: C, key: unknown): Promise<string | null> {
  if (!key) return null;
  const team = await c.env.DB.prepare("SELECT id FROM teams WHERE key = ?")
    .bind(String(key).toUpperCase())
    .first<{ id: string }>();
  if (!team) throw new HttpError(404, "team not found");
  return team.id;
}

function timestamp(value: unknown, field: string): string {
  const s = text(value, field, 40);
  if (Number.isNaN(Date.parse(s)))
    throw new HttpError(400, `${field} must be a date`);
  return s;
}

// An inbox item is a timeline update by someone else on a task the caller owns
// or collaborates on, or a comment that mentions the caller.
function inboxQuery(user: User, columns: string, tail = "") {
  const v = visible(user);
  const sql = `SELECT ${columns} FROM task_updates up
    JOIN tasks t ON t.id = up.task_id JOIN teams tm ON tm.id = t.team_id
    LEFT JOIN users a ON a.id = up.author_id
    WHERE (up.author_id IS NULL OR up.author_id != ?)
      AND (t.owner_id = ?
        OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = ?)
        OR EXISTS (SELECT 1 FROM json_each(json_extract(up.meta, '$.mentions')) j WHERE j.value = ?))
      AND ${v.sql} ${tail}`;
  return { sql, params: [user.id, user.id, user.id, user.id, ...v.params] };
}

export const miscRoutes = new Hono<Env>();

miscRoutes.get("/me", async (c) => {
  const user = c.get("user");
  const teams = await c.env.DB.prepare(
    `SELECT t.key, t.name, m.role FROM team_members m JOIN teams t ON t.id = m.team_id
     WHERE m.user_id = ? ORDER BY t.key`,
  )
    .bind(user.id)
    .all();
  return c.json({
    ...user,
    is_admin: user.is_admin === 1,
    teams: teams.results,
  });
});

miscRoutes.put("/me/whatsapp", async (c) => {
  const input = await body(c);
  const number =
    input.number === null
      ? null
      : normalizeNumber(text(input.number, "number", 30));
  if (input.number !== null && number === null)
    throw new HttpError(400, "number must be 8 to 15 digits with country code");
  try {
    await c.env.DB.prepare("UPDATE users SET whatsapp_number = ? WHERE id = ?")
      .bind(number, c.get("user").id)
      .run();
  } catch {
    throw new HttpError(409, "that number belongs to another user");
  }
  return c.json({ whatsapp_number: number });
});

miscRoutes.get("/inbox", async (c) => {
  const user = c.get("user");
  const q = inboxQuery(
    user,
    `up.id, up.kind, up.body, up.meta, up.created_at, a.name AS author_name,
     tm.key || '-' || t.number AS task_key, t.title AS task_title,
     up.created_at > (SELECT inbox_read_at FROM users WHERE id = ?) AS unread`,
    "ORDER BY up.created_at DESC LIMIT 100",
  );
  const { results } = await c.env.DB.prepare(q.sql)
    .bind(user.id, ...q.params)
    .all<{ meta: string; unread: number }>();
  const items = results.map((r) => ({
    ...r,
    meta: JSON.parse(r.meta),
    unread: r.unread === 1,
  }));
  return c.json({ unread: items.filter((i) => i.unread).length, items });
});

miscRoutes.post("/inbox/read", async (c) => {
  await c.env.DB.prepare(
    "UPDATE users SET inbox_read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  )
    .bind(c.get("user").id)
    .run();
  return c.json({ ok: true });
});

miscRoutes.get("/events", async (c) => {
  const { from, to } = range(c);
  return c.json(await listEvents(c, from, to));
});

miscRoutes.post("/events", async (c) => {
  const input = await body(c);
  const eventId = id();
  await c.env.DB.prepare(
    `INSERT INTO events (id, team_id, title, description, starts_at, ends_at, all_day, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      eventId,
      await teamIdByKey(c, input.team),
      text(input.title, "title", 300),
      typeof input.description === "string" ? input.description : "",
      timestamp(input.starts_at, "starts_at"),
      input.ends_at ? timestamp(input.ends_at, "ends_at") : null,
      input.all_day ? 1 : 0,
      c.get("user").id,
    )
    .run();
  return c.json(await eventById(c, eventId), 201);
});

miscRoutes.patch("/events/:id", async (c) => {
  const event = await eventById(c, c.req.param("id"));
  await requireEventEditor(c, event);
  const input = await body(c);
  await c.env.DB.prepare(
    `UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, all_day = ? WHERE id = ?`,
  )
    .bind(
      input.title === undefined ? event.title : text(input.title, "title", 300),
      input.description === undefined
        ? event.description
        : String(input.description),
      input.starts_at === undefined
        ? event.starts_at
        : timestamp(input.starts_at, "starts_at"),
      input.ends_at === undefined
        ? event.ends_at
        : input.ends_at === null
          ? null
          : timestamp(input.ends_at, "ends_at"),
      input.all_day === undefined ? event.all_day : input.all_day ? 1 : 0,
      event.id,
    )
    .run();
  return c.json(await eventById(c, event.id));
});

miscRoutes.delete("/events/:id", async (c) => {
  const event = await eventById(c, c.req.param("id"));
  await requireEventEditor(c, event);
  await c.env.DB.prepare("DELETE FROM events WHERE id = ?")
    .bind(event.id)
    .run();
  return c.json({ ok: true });
});

miscRoutes.get("/calendar", async (c) => {
  const { from, to } = range(c);
  const v = visible(c.get("user"));
  const [tasks, events] = await Promise.all([
    c.env.DB.prepare(
      `SELECT t.*, tm.key AS team_key, o.name AS owner_name, o.avatar_url AS owner_avatar
       FROM tasks t JOIN teams tm ON tm.id = t.team_id LEFT JOIN users o ON o.id = t.owner_id
       WHERE (t.due_date IS NOT NULL OR t.start_date IS NOT NULL)
         AND (? IS NULL OR COALESCE(t.due_date, t.start_date) >= ?)
         AND (? IS NULL OR COALESCE(t.start_date, t.due_date) <= ?)
         AND ${v.sql} ORDER BY COALESCE(t.due_date, t.start_date) LIMIT 1000`,
    )
      .bind(from, from, to, to, ...v.params)
      .all(),
    listEvents(c, from, to),
  ]);
  return c.json({ tasks: await hydrate(c, tasks.results as never), events });
});

miscRoutes.get("/overview", async (c) => {
  const v = visible(c.get("user"));
  const today = new Date().toISOString().slice(0, 10);
  const counts = `COUNT(CASE WHEN t.status NOT IN ('done', 'canceled') THEN 1 END) AS open,
    COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) AS blocked,
    COUNT(CASE WHEN t.status NOT IN ('done', 'canceled') AND t.due_date < ? THEN 1 END) AS overdue,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS done`;
  const [teams, owners] = await Promise.all([
    c.env.DB.prepare(
      `SELECT tm.key, tm.name, ${counts} FROM teams tm
       LEFT JOIN tasks t ON t.team_id = tm.id AND ${v.sql} GROUP BY tm.id ORDER BY tm.key`,
    )
      .bind(today, ...v.params)
      .all(),
    c.env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url, ${counts} FROM users u
       JOIN tasks t ON t.owner_id = u.id AND ${v.sql} GROUP BY u.id ORDER BY open DESC, u.name`,
    )
      .bind(today, ...v.params)
      .all(),
  ]);
  return c.json({ teams: teams.results, owners: owners.results });
});
