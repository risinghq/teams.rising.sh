import { Hono } from "hono";
import {
  createProject as createProjectBody,
  patchProject as patchProjectBody,
} from "../../shared/schemas";
import { requireLeader, teamRole } from "../access";
import type { Env } from "../env";
import { HttpError, id, parseBody } from "../http";
import { teamByKey } from "../teams/routes";
import {
  findProject,
  insertProject,
  listProjects,
  updateProject,
} from "./queries";

export const projectRoutes = new Hono<Env>();

projectRoutes.get("/teams/:key/projects", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  return c.json(await listProjects(c.env.DB, c.get("user"), team.id));
});

projectRoutes.post("/teams/:key/projects", async (c) => {
  const team = await teamByKey(c, c.req.param("key"));
  if ((await teamRole(c.env.DB, c.get("user"), team.id)) === null)
    throw new HttpError(403, "primero únete al equipo");
  const input = await parseBody(c, createProjectBody);
  const projectId = id();
  await insertProject(c.env.DB, { id: projectId, team_id: team.id, ...input });
  return c.json(await findProject(c.env.DB, projectId), 201);
});

projectRoutes.patch("/projects/:id", async (c) => {
  const project = await findProject(c.env.DB, c.req.param("id"));
  if (!project) throw new HttpError(404, "proyecto no encontrado");
  await requireLeader(c.env.DB, c.get("user"), project.team_id);
  const input = await parseBody(c, patchProjectBody);
  await updateProject(c.env.DB, {
    id: project.id,
    name: input.name ?? project.name,
    description: input.description ?? project.description,
    status: input.status ?? project.status,
    start_date:
      input.start_date === undefined ? project.start_date : input.start_date,
    target_date:
      input.target_date === undefined ? project.target_date : input.target_date,
  });
  return c.json(await findProject(c.env.DB, project.id));
});
