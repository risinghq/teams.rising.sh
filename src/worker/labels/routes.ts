import { Hono } from "hono";
import { createLabel } from "../../shared/schemas";
import { requireAdmin, requireLeader } from "../access";
import type { Env } from "../env";
import { HttpError, id, parseBody } from "../http";
import { deleteLabel, insertLabel, labelById, listLabels } from "./queries";

export const labelRoutes = new Hono<Env>();

labelRoutes.get("/labels", async (c) => c.json(await listLabels(c.env.DB)));

labelRoutes.post("/labels", async (c) => {
  const input = await parseBody(c, createLabel);
  const label = { id: id(), ...input, team_id: input.team_id ?? null };
  if (!(await insertLabel(c.env.DB, label)))
    throw new HttpError(409, "esa etiqueta ya existe");
  return c.json({ id: label.id }, 201);
});

// A team's leaders delete its labels. A shared label spans every team, so only
// an admin deletes it.
labelRoutes.delete("/labels/:id", async (c) => {
  const user = c.get("user");
  const label = await labelById(c.env.DB, c.req.param("id"));
  if (!label) throw new HttpError(404, "etiqueta no encontrada");
  if (label.team_id) await requireLeader(c.env.DB, user, label.team_id);
  else requireAdmin(user);
  await deleteLabel(c.env.DB, label.id);
  return c.json({ ok: true });
});
