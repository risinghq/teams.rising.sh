import { Hono } from "hono";

export type Env = { Bindings: { DB: D1Database; ASSETS: Fetcher } };

const app = new Hono<Env>();

app.get("/api/health", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) AS teams FROM teams",
  ).first<{
    teams: number;
  }>();
  return c.json({ ok: true, teams: row?.teams ?? 0 });
});

app.notFound((c) => c.json({ error: "not found" }, 404));

export default app;
