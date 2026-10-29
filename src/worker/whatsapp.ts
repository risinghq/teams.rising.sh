import { Hono } from "hono";
import { visible } from "./access";
import type { Env, User } from "./env";
import { HttpError, id } from "./http";
import { taskKeys } from "./github";
import { validSignature } from "./signature";

type Json = Record<string, any>;

export type Inbound = { waId: string; from: string; text: string };

// WhatsApp numbers are stored as digits with the country code, the form the
// Cloud API reports in `from`.
export function normalizeNumber(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

// The text messages of a Cloud API payload.
export function inboundMessages(p: Json): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        if (m.type === "text" && m.text?.body)
          out.push({ waId: m.id, from: m.from, text: m.text.body });
      }
    }
  }
  return out;
}

// Writes the message as a `whatsapp` update on the first task it names that
// the sender may see. Meta redelivers on a slow reply, so a message id is
// written once.
async function applyMessage(db: D1Database, m: Inbound) {
  const user = await db
    .prepare("SELECT * FROM users WHERE whatsapp_number = ?")
    .bind(m.from)
    .first<User>();
  if (!user) return false;
  const seen = await db
    .prepare(
      "SELECT 1 FROM task_updates WHERE kind = 'whatsapp' AND json_extract(meta, '$.wa_id') = ?",
    )
    .bind(m.waId)
    .first();
  if (seen) return false;
  const v = visible(user);
  for (const k of taskKeys(m.text)) {
    const dash = k.lastIndexOf("-");
    const task = await db
      .prepare(
        `SELECT t.id FROM tasks t JOIN teams tm ON tm.id = t.team_id
         WHERE tm.key = ? AND t.number = ? AND ${v.sql}`,
      )
      .bind(k.slice(0, dash), Number(k.slice(dash + 1)), ...v.params)
      .first<{ id: string }>();
    if (!task) continue;
    await db
      .prepare(
        "INSERT INTO task_updates (id, task_id, author_id, kind, body, meta) VALUES (?, ?, ?, 'whatsapp', ?, ?)",
      )
      .bind(id(), task.id, user.id, m.text, JSON.stringify({ wa_id: m.waId }))
      .run();
    return true;
  }
  return false;
}

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
  let payload: Json;
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
