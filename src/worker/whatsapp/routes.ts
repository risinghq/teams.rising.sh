import { Hono } from "hono";
import type { Env } from "../env";
import { HttpError } from "../http";
import { validSignature } from "../signature";
import { applyMessage } from "./apply";
import { inboundMessages } from "./messages";

export const whatsappRoutes = new Hono<Env>();

// Meta's subscription handshake.
whatsappRoutes.get("/whatsapp", (c) => {
  const token = c.env.WHATSAPP_VERIFY_TOKEN;
  if (!token)
    return c.json({ error: "whatsapp webhook is not configured" }, 503);
  if (
    c.req.query("hub.mode") !== "subscribe" ||
    c.req.query("hub.verify_token") !== token
  )
    throw new HttpError(403, "bad verify token");
  return c.text(c.req.query("hub.challenge") ?? "");
});

whatsappRoutes.post("/whatsapp", async (c) => {
  const secret = c.env.WHATSAPP_APP_SECRET;
  if (!secret)
    return c.json({ error: "whatsapp webhook is not configured" }, 503);
  const raw = await c.req.text();
  if (!(await validSignature(secret, raw, c.req.header("x-hub-signature-256"))))
    throw new HttpError(401, "bad signature");
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "body must be JSON");
  }
  let recorded = 0;
  for (const m of inboundMessages(payload)) {
    if (await applyMessage(c.env.DB, m)) recorded++;
  }
  return c.json({ ok: true, recorded });
});
