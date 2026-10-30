import { Hono } from "hono";
import type { Env } from "../env";
import { HttpError } from "../http";
import { validSignature } from "../signature";
import { applyLink } from "./apply";
import { linksFromEvent } from "./events";

export const githubRoutes = new Hono<Env>();

githubRoutes.post("/github", async (c) => {
  const secret = c.env.GITHUB_WEBHOOK_SECRET;
  if (!secret)
    return c.json({ error: "github webhook is not configured" }, 503);
  const raw = await c.req.text();
  if (!(await validSignature(secret, raw, c.req.header("x-hub-signature-256"))))
    throw new HttpError(401, "bad signature");
  const event = c.req.header("x-github-event") ?? "";
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "body must be JSON");
  }
  let linked = 0;
  for (const spec of linksFromEvent(event, payload)) {
    if (await applyLink(c.env.DB, spec)) linked++;
  }
  return c.json({ ok: true, linked });
});
