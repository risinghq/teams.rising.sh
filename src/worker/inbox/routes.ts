import { Hono } from "hono";
import type { Env } from "../env";
import { listInbox, markInboxRead } from "./queries";

export const inboxRoutes = new Hono<Env>();

inboxRoutes.get("/inbox", async (c) => {
  const items = await listInbox(c.env.DB, c.get("user"));
  return c.json({ unread: items.filter((i) => i.unread).length, items });
});

inboxRoutes.post("/inbox/read", async (c) => {
  await markInboxRead(c.env.DB, c.get("user").id);
  return c.json({ ok: true });
});
