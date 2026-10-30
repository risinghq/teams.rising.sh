import { Hono } from "hono";
import { createLabel } from "../../shared/schemas";
import type { Env } from "../env";
import { HttpError, id, parseBody } from "../http";
import { insertLabel, listLabels } from "./queries";

export const labelRoutes = new Hono<Env>();

labelRoutes.get("/labels", async (c) => c.json(await listLabels(c.env.DB)));

labelRoutes.post("/labels", async (c) => {
  const input = await parseBody(c, createLabel);
  const label = { id: id(), ...input, team_id: input.team_id ?? null };
  if (!(await insertLabel(c.env.DB, label)))
    throw new HttpError(409, "esa etiqueta ya existe");
  return c.json({ id: label.id }, 201);
});
