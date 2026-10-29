import { afterAll, beforeAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../src/worker/index";
import { inboundMessages, normalizeNumber } from "../src/worker/whatsapp";

const SECRET = "wa-secret";
const VERIFY = "wa-verify";
let mf: Miniflare;
let env: Record<string, unknown>;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('') } }",
    d1Databases: { DB: "wa" },
  });
  const DB = await mf.getD1Database("DB");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    for (const statement of sql.split(/;\s*\n/)) {
      const clean = statement.replace(/^--.*$/gm, "").trim();
      if (clean) await DB.prepare(clean).run();
    }
  }
  env = {
    DB,
    ASSETS: { fetch: () => new Response("asset") },
    DEV_LOGIN: "1",
    WHATSAPP_APP_SECRET: SECRET,
    WHATSAPP_VERIFY_TOKEN: VERIFY,
  };
});

afterAll(() => mf.dispose());

async function sign(raw: string, secret = SECRET) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(raw),
  );
  return `sha256=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const message = (from: string, text: string, wamid: string) => ({
  entry: [
    {
      changes: [
        {
          value: {
            messages: [{ id: wamid, from, type: "text", text: { body: text } }],
          },
        },
      ],
    },
  ],
});

async function post(payload: unknown, secret = SECRET) {
  const raw = JSON.stringify(payload);
  const res = await app.request(
    "/hooks/whatsapp",
    {
      method: "POST",
      headers: { "x-hub-signature-256": await sign(raw, secret) },
      body: raw,
    },
    env,
  );
  return { status: res.status, body: (await res.json()) as any };
}

async function session(email: string) {
  const res = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email, name: email }) },
    env,
  );
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return async (method: string, path: string, json?: unknown) => {
    const r = await app.request(
      path,
      {
        method,
        headers: { cookie },
        body: json === undefined ? undefined : JSON.stringify(json),
      },
      env,
    );
    const t = await r.text();
    return { status: r.status, body: t ? JSON.parse(t) : null };
  };
}

test("numbers are stored as digits and rejected when malformed", () => {
  expect(normalizeNumber("+51 987-654-321")).toBe("51987654321");
  expect(normalizeNumber("12ab")).toBeNull();
});

test("only text messages are read from a payload", () => {
  const p = message("5199", "hi", "w1");
  p.entry[0]!.changes[0]!.value.messages.push({
    id: "w2",
    from: "5199",
    type: "image",
    text: { body: "x" },
  });
  expect(inboundMessages(p).map((m) => m.waId)).toEqual(["w1"]);
});

test("the handshake answers with the challenge for the right token", async () => {
  const ok = await app.request(
    `/hooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=42`,
    {},
    env,
  );
  expect(await ok.text()).toBe("42");
  const bad = await app.request(
    "/hooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42",
    {},
    env,
  );
  expect(bad.status).toBe(403);
});

test("a known sender's message becomes an update, once", async () => {
  const admin = await session("wa-admin@x.test");
  const member = await session("wa-member@x.test");
  const stranger = await session("wa-stranger@x.test");
  expect(
    (await member("PUT", "/api/me/whatsapp", { number: "+51 900 000 001" }))
      .body,
  ).toEqual({ whatsapp_number: "51900000001" });
  expect(
    (await stranger("PUT", "/api/me/whatsapp", { number: "51900000001" }))
      .status,
  ).toBe(409);
  await admin("POST", "/api/teams", { key: "WAT", name: "Chat" });
  const open = (
    await admin("POST", "/api/tasks", { team: "WAT", title: "open" })
  ).body;
  const secret = (
    await admin("POST", "/api/tasks", {
      team: "WAT",
      title: "hidden",
      visibility: "private",
    })
  ).body;

  const sent = message("51900000001", `${open.key} truck arrived`, "wamid.1");
  expect((await post(sent)).body.recorded).toBe(1);
  expect((await post(sent)).body.recorded).toBe(0);
  const task = (await admin("GET", `/api/tasks/${open.key}`)).body;
  const wa = task.updates.filter((u: any) => u.kind === "whatsapp");
  expect(wa).toHaveLength(1);
  expect(wa[0].body).toContain("truck arrived");

  const hidden = message("51900000001", `${secret.key} peek`, "wamid.2");
  expect((await post(hidden)).body.recorded).toBe(0);
  const unknown = message("51911111111", `${open.key} hi`, "wamid.3");
  expect((await post(unknown)).body.recorded).toBe(0);
});

test("a bad signature is refused", async () => {
  expect((await post(message("1", "x", "w"), "wrong")).status).toBe(401);
});
