import { Hono } from "hono";
import { authRoutes, requireUser } from "./auth/routes";
import type { Env } from "./env";
import { eventRoutes } from "./events/routes";
import { githubRoutes } from "./github/routes";
import { HttpError } from "./http";
import { inboxRoutes } from "./inbox/routes";
import { labelRoutes } from "./labels/routes";
import { overviewRoutes } from "./overview/routes";
import { projectRoutes } from "./projects/routes";
import { taskRoutes } from "./tasks/routes";
import { countTeams } from "./teams/queries";
import { teamRoutes } from "./teams/routes";
import { userRoutes } from "./users/routes";
import { whatsappRoutes } from "./whatsapp/routes";

export type { Env };

const app = new Hono<Env>();

app.onError((err, c) => {
  if (err instanceof HttpError)
    return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.get("/api/health", async (c) =>
  c.json({ ok: true, teams: await countTeams(c.env.DB) }),
);

app.route("/api/auth", authRoutes);
app.route("/hooks", githubRoutes);
app.route("/hooks", whatsappRoutes);

const api = new Hono<Env>();
api.use("*", requireUser);
for (const routes of [
  userRoutes,
  teamRoutes,
  projectRoutes,
  labelRoutes,
  taskRoutes,
  eventRoutes,
  inboxRoutes,
  overviewRoutes,
]) {
  api.route("/", routes);
}
app.route("/api", api);

app.notFound((c) =>
  c.req.path.startsWith("/api/")
    ? c.json({ error: "not found" }, 404)
    : c.env.ASSETS.fetch(c.req.raw),
);

export default app;
