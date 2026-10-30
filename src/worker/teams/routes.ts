import { Hono } from "hono";
import {
  createTeam as createTeamBody,
  patchTeam as patchTeamBody,
  setMember as setMemberBody,
} from "../../shared/schemas";
import type { Team, TeamDetail } from "../../shared/types";
import { requireAdmin, requireLeader } from "../access";
import type { Env } from "../env";
import { type C, HttpError, id, parseBody } from "../http";
import {
  deleteMember,
  findTeam,
  findTeamWithCount,
  insertTeam,
  isLastLeader,
  listMembers,
  listTeams,
  updateTeam,
  upsertMember,
  type TeamRow,
} from "./queries";

export async function teamByKey(c: C, key: string): Promise<TeamRow> {
  const team = await findTeam(c.env.DB, key);
  if (!team) throw new HttpError(404, "equipo no encontrado");
  return team;
}

// A team always keeps a leader, so demoting or removing the last one is refused.
async function keepALeader(c: C, teamId: string, userId: string) {
  if (await isLastLeader(c.env.DB, teamId, userId))
    throw new HttpError(409, "un equipo necesita al menos un líder");
}

export const teamRoutes = new Hono<Env>();

teamRoutes.get("/teams", async (c) => {
  const teams: Team[] = await listTeams(c.env.DB);
  return c.json(teams);
});

teamRoutes.post("/teams", async (c) => {
  requireAdmin(c.get("user"));
  const input = await parseBody(c, createTeamBody);
  const created = await insertTeam(
    c.env.DB,
    { id: id(), ...input },
    input.leaders,
  );
  if (!created)
    throw new HttpError(409, "la clave ya está en uso o un líder no existe");
  const team = (await findTeamWithCount(c.env.DB, input.key)) as Team;
  return c.json(team, 201);
});

teamRoutes.get("/teams/:key", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  const detail: TeamDetail = {
    ...team,
    members: await listMembers(c.env.DB, team.id),
  };
  return c.json(detail);
});

teamRoutes.patch("/teams/:key", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c.env.DB, c.get("user"), team.id);
  const input = await parseBody(c, patchTeamBody);
  await updateTeam(
    c.env.DB,
    team.id,
    input.name ?? team.name,
    input.description ?? team.description,
  );
  const updated = (await findTeamWithCount(c.env.DB, team.key)) as Team;
  return c.json(updated);
});

teamRoutes.put("/teams/:key/members/:userId", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c.env.DB, c.get("user"), team.id);
  const { role } = await parseBody(c, setMemberBody);
  const userId = c.req.param("userId");
  if (role === "member") await keepALeader(c, team.id, userId);
  if (!(await upsertMember(c.env.DB, team.id, userId, role)))
    throw new HttpError(404, "usuario no encontrado");
  return c.json({ ok: true });
});

teamRoutes.delete("/teams/:key/members/:userId", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  await requireLeader(c.env.DB, c.get("user"), team.id);
  const userId = c.req.param("userId");
  await keepALeader(c, team.id, userId);
  await deleteMember(c.env.DB, team.id, userId);
  return c.json({ ok: true });
});
