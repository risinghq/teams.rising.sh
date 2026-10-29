import { Hono } from "hono";
import { authRoutes, requireUser } from "./auth";
import type { Env } from "./env";
import { githubRoutes } from "./github";
import { HttpError } from "./http";
import { miscRoutes } from "./misc";
import { taskRoutes } from "./tasks";
import { teamRoutes } from "./teams";
import { whatsappRoutes } from "./whatsapp";

export type { Env };

const app = new Hono<Env>();

app.onError((err, c) => {
  if (err instanceof HttpError)
    return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) AS teams FROM teams",
  ).first<{
    teams: number;
  }>();
  return c.json({ ok: true, teams: row?.teams ?? 0 });
});

app.route("/api/auth", authRoutes);
app.route("/hooks", githubRoutes);
app.route("/hooks", whatsappRoutes);

const api = new Hono<Env>();
api.use("*", requireUser);
api.route("/", teamRoutes);
api.route("/", taskRoutes);
api.route("/", miscRoutes);
app.route("/api", api);

app.notFound((c) =>
  c.req.path.startsWith("/api/")
    ? c.json({ error: "not found" }, 404)
    : c.env.ASSETS.fetch(c.req.raw),
);

export default app;
