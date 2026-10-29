import { afterAll, beforeAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../src/worker/index";

let mf: Miniflare;
let env: Record<string, unknown>;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('') } }",
    d1Databases: { DB: "test" },
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
  env = { DB, ASSETS: { fetch: () => new Response("asset") }, DEV_LOGIN: "1" };
});

afterAll(() => mf.dispose());

type Session = { cookie: string; id: string };

async function login(email: string, name = email): Promise<Session> {
  const res = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email, name }) },
    env,
  );
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return { cookie, id: ((await res.json()) as { id: string }).id };
}

async function call(
  who: Session | null,
  method: string,
  path: string,
  json?: unknown,
) {
  const res = await app.request(
    path,
    {
      method,
      headers: who ? { cookie: who.cookie } : {},
      body: json === undefined ? undefined : JSON.stringify(json),
    },
    env,
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const run = Date.now().toString(36);
const key = (n: number) => `T${n}${run}`.toUpperCase().slice(0, 6);

test("every route but health and auth needs a session", async () => {
  expect((await call(null, "GET", "/api/tasks")).status).toBe(401);
  expect((await call(null, "GET", "/api/health")).status).toBe(200);
});

test("the first human becomes admin and others do not", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const other = await login(`other-${run}@x.test`);
  expect((await call(admin, "GET", "/api/me")).body.is_admin).toBe(true);
  expect((await call(other, "GET", "/api/me")).body.is_admin).toBe(false);
});

test("a private task is visible to its circle and no one else", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const lead = await login(`lead-${run}@x.test`);
  const owner = await login(`owner-${run}@x.test`);
  const helper = await login(`helper-${run}@x.test`);
  const stranger = await login(`stranger-${run}@x.test`);
  const team = key(1);
  expect(
    (await call(admin, "POST", "/api/teams", { key: team, name: "Ops" }))
      .status,
  ).toBe(201);
  for (const [who, role] of [
    [lead, "leader"],
    [owner, "member"],
  ] as const) {
    await call(admin, "PUT", `/api/teams/${team}/members/${who.id}`, { role });
  }
  const created = await call(owner, "POST", "/api/tasks", {
    team,
    title: "secret",
    visibility: "private",
  });
  expect(created.status).toBe(201);
  const path = `/api/tasks/${created.body.key}`;
  await call(owner, "PUT", `${path}/collaborators/${helper.id}`);

  for (const who of [admin, lead, owner, helper]) {
    expect((await call(who, "GET", path)).status).toBe(200);
  }
  expect((await call(stranger, "GET", path)).status).toBe(404);
  const list = await call(stranger, "GET", `/api/tasks?team=${team}`);
  expect(list.body).toEqual([]);
  const joined = await call(stranger, "PUT", `${path}/collaborators/me`);
  expect(joined.status).toBe(404);
});

test("anyone can join an open task and help", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const outsider = await login(`outsider-${run}@x.test`);
  const team = key(2);
  await call(admin, "POST", "/api/teams", { key: team, name: "Dev" });
  const task = await call(admin, "POST", "/api/tasks", { team, title: "open" });
  const path = `/api/tasks/${task.body.key}`;
  expect((await call(outsider, "PATCH", path, { status: "done" })).status).toBe(
    403,
  );
  expect((await call(outsider, "PUT", `${path}/collaborators/me`)).status).toBe(
    200,
  );
  expect(
    (await call(outsider, "PATCH", path, { status: "in_progress" })).status,
  ).toBe(200);
});

test("concurrent creates get distinct numbers", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(3);
  await call(admin, "POST", "/api/teams", { key: team, name: "Race" });
  const made = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      call(admin, "POST", "/api/tasks", { team, title: `task ${i}` }),
    ),
  );
  const numbers = made
    .filter((m) => m.status === 201)
    .map((m) => m.body.number);
  expect(new Set(numbers).size).toBe(numbers.length);
  expect(numbers.length).toBeGreaterThan(0);
});

test("a patch writes timeline rows for status, owner and due only", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(4);
  await call(admin, "POST", "/api/teams", { key: team, name: "Log" });
  const task = await call(admin, "POST", "/api/tasks", { team, title: "log" });
  const path = `/api/tasks/${task.body.key}`;
  await call(admin, "PATCH", path, {
    status: "blocked",
    due_date: "2026-11-01",
    owner_id: null,
    title: "renamed",
    priority: 2,
  });
  const detail = await call(admin, "GET", path);
  const kinds = detail.body.updates.map((u: { kind: string }) => u.kind).sort();
  expect(kinds).toEqual(["due", "owner", "status"]);
  expect(detail.body.title).toBe("renamed");
  expect(detail.body.progress).toBe(0);
});

test("subtasks decide progress", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(5);
  await call(admin, "POST", "/api/teams", { key: team, name: "Sub" });
  const parent = await call(admin, "POST", "/api/tasks", {
    team,
    title: "parent",
  });
  for (const status of ["done", "todo"]) {
    await call(admin, "POST", "/api/tasks", {
      team,
      title: status,
      status,
      parent: parent.body.key,
    });
  }
  const detail = await call(admin, "GET", `/api/tasks/${parent.body.key}`);
  expect(detail.body.progress).toBe(0.5);
  expect(detail.body.subtasks.length).toBe(2);
});

test("a mention puts the comment in the inbox until it is read", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const ana = await login(`ana-${run}@x.test`, "Ana");
  const team = key(6);
  await call(admin, "POST", "/api/teams", { key: team, name: "Mail" });
  const task = await call(admin, "POST", "/api/tasks", {
    team,
    title: "ping",
    owner_id: admin.id,
  });
  const path = `/api/tasks/${task.body.key}`;
  await call(admin, "POST", `${path}/updates`, {
    body: `hello @ana-${run}`,
  });
  const inbox = await call(ana, "GET", "/api/inbox");
  expect(inbox.body.unread).toBe(1);
  await call(ana, "POST", "/api/inbox/read");
  expect((await call(ana, "GET", "/api/inbox")).body.unread).toBe(0);
  const ownerInbox = await call(admin, "GET", "/api/inbox");
  const own = ownerInbox.body.items.filter(
    (i: { task_key: string }) => i.task_key === task.body.key,
  );
  expect(own).toEqual([]);
});

test("the calendar merges dated tasks and events", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(7);
  await call(admin, "POST", "/api/teams", { key: team, name: "Cal" });
  await call(admin, "POST", "/api/tasks", {
    team,
    title: "due",
    due_date: "2031-03-05",
  });
  await call(admin, "POST", "/api/events", {
    title: "kickoff",
    starts_at: "2031-03-06T10:00:00Z",
  });
  const cal = await call(
    admin,
    "GET",
    "/api/calendar?from=2031-03-01&to=2031-03-31",
  );
  expect(cal.body.tasks.map((t: { title: string }) => t.title)).toEqual([
    "due",
  ]);
  expect(cal.body.events.map((e: { title: string }) => e.title)).toEqual([
    "kickoff",
  ]);
});

test("sign-in by Google is limited to the allow list", async () => {
  const googleEnv = {
    ...env,
    DEV_LOGIN: undefined,
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_CLIENT_SECRET: "secret",
    ALLOWED_DOMAINS: "ok.test",
  };
  const realFetch = globalThis.fetch;
  const idToken = (email: string) => {
    const part = (v: object) => btoa(JSON.stringify(v));
    return `${part({ alg: "RS256" })}.${part({
      iss: "https://accounts.google.com",
      aud: "client",
      exp: Math.floor(Date.now() / 1000) + 600,
      email,
      email_verified: true,
      name: "G",
    })}.sig`;
  };
  try {
    for (const [email, status] of [
      ["me@ok.test", 302],
      ["me@bad.test", 403],
    ] as const) {
      globalThis.fetch = (async () =>
        Response.json({
          id_token: idToken(email),
          refresh_token: "r",
        })) as unknown as typeof fetch;
      const res = await app.request(
        "/api/auth/google/callback?code=c&state=s",
        { headers: { cookie: "oauth_state=s" } },
        googleEnv,
      );
      expect(res.status).toBe(status);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  const dev = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email: "x@ok.test" }) },
    googleEnv,
  );
  expect(dev.status).toBe(404);
});
