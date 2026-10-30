import { Hono } from "hono";
import {
  comment as commentBody,
  createTask as createTaskBody,
  patchTask as patchTaskBody,
  taskQuery,
} from "../../shared/schemas";
import type { TaskDetail } from "../../shared/types";
import { teamRole } from "../access";
import type { Env } from "../env";
import { HttpError, id, parseBody, parseQuery, type C } from "../http";
import { teamByKey } from "../teams/routes";
import {
  addCollaborator,
  collaboratorsOf,
  findVisibleTask,
  hydrate,
  insertComment,
  insertTask,
  isCollaborator,
  linksOf,
  listTasks,
  mentionedUserIds,
  removeCollaborator,
  subtasksOf,
  taskById,
  updatesOf,
  updateTask,
  type TaskRow,
} from "./queries";

function parseKey(key: string): { team: string; number: number } {
  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(key);
  if (!match?.[1] || !match[2]) throw new HttpError(404, "tarea no encontrada");
  return { team: match[1].toUpperCase(), number: Number(match[2]) };
}

export async function taskByKey(c: C, key: string): Promise<TaskRow> {
  const { team, number } = parseKey(key);
  const row = await findVisibleTask(c.env.DB, c.get("user"), team, number);
  if (!row) throw new HttpError(404, "tarea no encontrada");
  return row;
}

async function canEdit(c: C, task: TaskRow): Promise<boolean> {
  const user = c.get("user");
  if (task.owner_id === user.id || task.created_by === user.id) return true;
  if ((await teamRole(c.env.DB, user, task.team_id)) === "leader") return true;
  return isCollaborator(c.env.DB, task.id, user.id);
}

const mentionNames = (text: string) =>
  // A handle ends on a word character, so "@lucia." at a sentence end is lucia.
  [...text.matchAll(/@([\w.-]*\w)/g)].map((m) => (m[1] ?? "").toLowerCase());

const collaboratorTarget = (c: C, userId: string) =>
  userId === "me" ? c.get("user").id : userId;

export const taskRoutes = new Hono<Env>();

taskRoutes.get("/tasks", async (c) => {
  const user = c.get("user");
  const { rows, next } = await listTasks(
    c.env.DB,
    user,
    parseQuery(c, taskQuery),
  );
  if (next) c.header("X-Next-Cursor", next);
  return c.json(await hydrate(c.env.DB, user, rows));
});

taskRoutes.post("/tasks", async (c) => {
  const user = c.get("user");
  const input = await parseBody(c, createTaskBody);
  const team = await teamByKey(c, input.team);
  const parent = input.parent ? await taskByKey(c, input.parent) : null;
  const taskId = id();
  await insertTask(c.env.DB, {
    ...input,
    id: taskId,
    team_id: team.id,
    parent_id: parent?.id ?? null,
    project_id: input.project_id ?? null,
    owner_id: input.owner_id === undefined ? user.id : input.owner_id,
    created_by: user.id,
  });
  const row = (await taskById(c.env.DB, taskId)) as TaskRow;
  return c.json((await hydrate(c.env.DB, user, [row]))[0], 201);
});

taskRoutes.get("/tasks/:key", async (c) => {
  const user = c.get("user");
  const row = await taskByKey(c, c.req.param("key"));
  const [[task], subtasks, collaborators, links, updates] = await Promise.all([
    hydrate(c.env.DB, user, [row]),
    subtasksOf(c.env.DB, user, row.id),
    collaboratorsOf(c.env.DB, row.id),
    linksOf(c.env.DB, row.id),
    updatesOf(c.env.DB, row.id),
  ]);
  const detail: TaskDetail = {
    ...(task as TaskDetail),
    subtasks: await hydrate(c.env.DB, user, subtasks),
    collaborators,
    links,
    updates,
  };
  return c.json(detail);
});

taskRoutes.patch("/tasks/:key", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  if (!(await canEdit(c, task)))
    throw new HttpError(
      403,
      "solo el responsable, un colaborador o un líder puede editar",
    );
  await updateTask(c.env.DB, user.id, task, await parseBody(c, patchTaskBody));
  const updated = await taskByKey(c, c.req.param("key"));
  return c.json((await hydrate(c.env.DB, user, [updated]))[0]);
});

taskRoutes.post("/tasks/:key/updates", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const { body } = await parseBody(c, commentBody);
  const mentions = await mentionedUserIds(c.env.DB, mentionNames(body));
  const updateId = await insertComment(
    c.env.DB,
    task.id,
    user.id,
    body,
    mentions,
  );
  return c.json({ id: updateId }, 201);
});

taskRoutes.put("/tasks/:key/collaborators/:userId", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const target = collaboratorTarget(c, c.req.param("userId"));
  const joinsSelf = target === user.id && task.visibility === "open";
  if (!joinsSelf && !(await canEdit(c, task)))
    throw new HttpError(
      403,
      "solo el responsable, un colaborador o un líder puede agregar a otras personas",
    );
  if (!(await addCollaborator(c.env.DB, task.id, target)))
    throw new HttpError(404, "usuario no encontrado");
  return c.json({ ok: true });
});

taskRoutes.delete("/tasks/:key/collaborators/:userId", async (c) => {
  const user = c.get("user");
  const task = await taskByKey(c, c.req.param("key"));
  const target = collaboratorTarget(c, c.req.param("userId"));
  if (target !== user.id && !(await canEdit(c, task)))
    throw new HttpError(403, "no permitido");
  await removeCollaborator(c.env.DB, task.id, target);
  return c.json({ ok: true });
});
