import { Hono } from "hono";
import { requireAdmin, requireLeader, teamRole } from "./access";
import type { Env } from "./env";
import { body, date, HttpError, id, oneOf, text, type C } from "./http";

export type TeamRow = {
  id: string;
  key: string;
  name: string;
  description: string;
};

export async function teamByKey(c: C, key: string): Promise<TeamRow> {
  const team = await c.env.DB.prepare(
    "SELECT id, key, name, description FROM teams WHERE key = ?",
  )
    .bind(key.toUpperCase())
    .first<TeamRow>();
  if (!team) throw new HttpError(404, "equipo no encontrado");
  return team;
}

export const teamRoutes = new Hono<Env>();

teamRoutes.get("/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, name, avatar_url, kind FROM users ORDER BY name",
  ).all();
  return c.json(results);
});

teamRoutes.get("/teams", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.key, t.name, t.description,
       (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) AS members
     FROM teams t ORDER BY t.name`,
  ).all();
  return c.json(results);
});

teamRoutes.post("/teams", async (c) => {
  requireAdmin(c);
  const input = await body(c);
  const key = text(input.key, "key", 6).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,5}$/.test(key))
    throw new HttpError(400, "la clave debe tener de 2 a 6 letras o números");
  const teamId = id();
  const leaders = Array.isArray(input.leaders)
    ? (input.leaders as string[])
    : [];
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO teams (id, key, name, description) VALUES (?, ?, ?, ?)",
      ).bind(
        teamId,
        key,
        text(input.name, "name", 100),
        typeof input.description === "string" ? input.description : "",
      ),
      ...leaders.map((userId) =>
        c.env.DB.prepare(
          "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'leader')",
        ).bind(teamId, userId),
      ),
    ]);
  } catch {
    throw new HttpError(409, "la clave ya está en uso o un líder no existe");
  }
  return c.json(await teamByKey(c, key), 201);
});

teamRoutes.get("/teams/:key", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.avatar_url, m.role FROM team_members m
     JOIN users u ON u.id = m.user_id WHERE m.team_id = ?
     ORDER BY m.role = 'leader' DESC, u.name`,
  )
    .bind(team.id)
    .all();
  return c.json({ ...team, members: results });
});

teamRoutes.patch("/teams/:key", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c, team.id);
  const input = await body(c);
  await c.env.DB.prepare(
    "UPDATE teams SET name = ?, description = ? WHERE id = ?",
  )
    .bind(
      input.name === undefined ? team.name : text(input.name, "name", 100),
      typeof input.description === "string"
        ? input.description
        : team.description,
      team.id,
    )
    .run();
  return c.json(await teamByKey(c, team.key));
});

teamRoutes.put("/teams/:key/members/:userId", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c, team.id);
  const input = await body(c);
  const role = oneOf(input.role ?? "member", ["leader", "member"], "role");
  const userId = c.req.param("userId");
  if (role === "member") await keepALeader(c, team.id, userId);
  try {
    await c.env.DB.prepare(
      `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = excluded.role`,
    )
      .bind(team.id, userId, role)
      .run();
  } catch {
    throw new HttpError(404, "usuario no encontrado");
  }
  return c.json({ ok: true });
});

teamRoutes.delete("/teams/:key/members/:userId", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c, team.id);
  await keepALeader(c, team.id, c.req.param("userId"));
  await c.env.DB.prepare(
    "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
  )
    .bind(team.id, c.req.param("userId"))
    .run();
  return c.json({ ok: true });
});

// A team always keeps a leader, so demoting or removing the last one is refused.
async function keepALeader(
  c: C,
  teamId: string,
  userId: string,
): Promise<void> {
  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) AS others FROM team_members
     WHERE team_id = ? AND role = 'leader' AND user_id != ?`,
  )
    .bind(teamId, userId)
    .first<{ others: number }>();
  const isLeader = await c.env.DB.prepare(
    "SELECT 1 AS yes FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'leader'",
  )
    .bind(teamId, userId)
    .first();
  if (isLeader && row?.others === 0)
    throw new HttpError(409, "un equipo necesita al menos un líder");
}

teamRoutes.get("/teams/:key/projects", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE team_id = ? ORDER BY status, name",
  )
    .bind(team.id)
    .all();
  return c.json(results);
});

teamRoutes.post("/teams/:key/projects", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  if ((await teamRole(c, team.id)) === null)
    throw new HttpError(403, "primero únete al equipo");
  const input = await body(c);
  const projectId = id();
  await c.env.DB.prepare(
    `INSERT INTO projects (id, team_id, name, description, start_date, target_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      projectId,
      team.id,
      text(input.name, "name", 100),
      typeof input.description === "string" ? input.description : "",
      date(input.start_date ?? null, "start_date"),
      date(input.target_date ?? null, "target_date"),
    )
    .run();
  return c.json(
    await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?")
      .bind(projectId)
      .first(),
    201,
  );
});

teamRoutes.patch("/projects/:id", async (c) => {
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{
      id: string;
      team_id: string;
      name: string;
      description: string;
      status: string;
      start_date: string | null;
      target_date: string | null;
    }>();
  if (!project) throw new HttpError(404, "proyecto no encontrado");
  await requireLeader(c, project.team_id);
  const input = await body(c);
  await c.env.DB.prepare(
    "UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, target_date = ? WHERE id = ?",
  )
    .bind(
      input.name === undefined ? project.name : text(input.name, "name", 100),
      typeof input.description === "string"
        ? input.description
        : project.description,
      input.status === undefined
        ? project.status
        : oneOf(input.status, ["active", "done", "archived"], "status"),
      input.start_date === undefined
        ? project.start_date
        : date(input.start_date, "start_date"),
      input.target_date === undefined
        ? project.target_date
        : date(input.target_date, "target_date"),
      project.id,
    )
    .run();
  return c.json(
    await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?")
      .bind(project.id)
      .first(),
  );
});

teamRoutes.get("/labels", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, team_id, name, color FROM labels ORDER BY name",
  ).all();
  return c.json(results);
});

teamRoutes.post("/labels", async (c) => {
  const input = await body(c);
  const labelId = id();
  try {
    await c.env.DB.prepare(
      "INSERT INTO labels (id, team_id, name, color) VALUES (?, ?, ?, ?)",
    )
      .bind(
        labelId,
        typeof input.team_id === "string" ? input.team_id : null,
        text(input.name, "name", 40),
        typeof input.color === "string" ? input.color : "#6b7280",
      )
      .run();
  } catch {
    throw new HttpError(409, "esa etiqueta ya existe");
  }
  return c.json({ id: labelId }, 201);
});
