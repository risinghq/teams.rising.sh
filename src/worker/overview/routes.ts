import { Hono } from "hono";
import type { Env } from "../env";
import { overview } from "./queries";

export const overviewRoutes = new Hono<Env>();

overviewRoutes.get("/overview", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  return c.json(await overview(c.env.DB, c.get("user"), today));
});
