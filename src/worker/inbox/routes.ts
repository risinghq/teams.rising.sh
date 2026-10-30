import { Hono } from "hono";
import type { Env } from "../env";
import { taskByKey } from "../tasks/routes";
import { listInbox, markInboxRead, markTaskRead } from "./queries";

export const inboxRoutes = new Hono<Env>();

// `unread` counts tasks with unread items, the rows the inbox shows.
inboxRoutes.get("/inbox", async (c) => {
  const items = await listInbox(c.env.DB, c.get("user"));
  const unread = new Set(items.filter((i) => i.unread).map((i) => i.task_key));
  return c.json({ unread: unread.size, items });
});

inboxRoutes.post("/inbox/read", async (c) => {
  await markInboxRead(c.env.DB, c.get("user").id);
  return c.json({ ok: true });
});

inboxRoutes.post("/inbox/read/:key", async (c) => {
  const task = await taskByKey(c, c.req.param("key"));
  await markTaskRead(c.env.DB, c.get("user").id, task.id);
  return c.json({ ok: true });
});
