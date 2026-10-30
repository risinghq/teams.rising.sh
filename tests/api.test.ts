import { afterAll, beforeAll, expect, test, setDefaultTimeout } from "bun:test";
import type { Miniflare } from "miniflare";
import type { Project, Task } from "../src/shared/types";
import { api } from "../src/web/api";
import app from "../src/worker/index";
import { HOST_TIMEOUT, migratedDb } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let env: Record<string, unknown>;

beforeAll(async () => {
  const started = await migratedDb("test");
  mf = started.mf;
  const DB = started.DB;
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
  return {
    status: res.status,
    headers: res.headers,
    body: text ? JSON.parse(text) : null,
  };
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
    body: `hello @ana-${run}.`,
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

test("opening one task reads its inbox items and leaves the others", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const bea = await login(`bea-${run}@x.test`, "Bea");
  const team = key(13);
  await call(admin, "POST", "/api/teams", { key: team, name: "Reads" });
  const keys: string[] = [];
  for (const title of ["one", "two"]) {
    const task = await call(admin, "POST", "/api/tasks", { team, title });
    keys.push(task.body.key);
    await call(admin, "POST", `/api/tasks/${task.body.key}/updates`, {
      body: `mira @bea-${run}`,
    });
  }
  const before = await call(bea, "GET", "/api/inbox");
  expect(before.body.unread).toBe(2);
  expect(before.body.items[0].mentioned).toBe(true);
  expect((await call(bea, "POST", `/api/inbox/read/${keys[0]}`)).status).toBe(
    200,
  );
  const after = await call(bea, "GET", "/api/inbox");
  expect(after.body.unread).toBe(1);
  const unread = after.body.items
    .filter((i: { unread: boolean }) => i.unread)
    .map((i: { task_key: string }) => i.task_key);
  expect(unread).toEqual([keys[1]]);
});

test("the inbox tells a person they were added, and an owner they were replaced", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const cai = await login(`cai-${run}@x.test`, "Cai");
  const dov = await login(`dov-${run}@x.test`, "Dov");
  const team = key(14);
  await call(admin, "POST", "/api/teams", { key: team, name: "Notice" });
  const task = await call(admin, "POST", "/api/tasks", {
    team,
    title: "handover",
    owner_id: dov.id,
  });
  const path = `/api/tasks/${task.body.key}`;
  await call(admin, "PUT", `${path}/collaborators/${cai.id}`);
  await call(admin, "PATCH", path, { owner_id: cai.id });

  const kinds = async (who: Session) =>
    (await call(who, "GET", "/api/inbox")).body.items
      .filter((i: { task_key: string }) => i.task_key === task.body.key)
      .map((i: { kind: string; meta: unknown }) => [i.kind, i.meta]);
  expect(await kinds(cai)).toEqual([
    ["owner", { from: dov.id, to: cai.id }],
    ["collaborator", { added: cai.id }],
  ]);
  expect(await kinds(dov)).toContainEqual([
    "owner",
    { from: dov.id, to: cai.id },
  ]);
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
    for (const [email, location] of [
      ["me@ok.test", "/"],
      ["me@bad.test", "/login?error=me%40bad.test+no+tiene+acceso"],
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
      expect(res.status).toBe(302);
      expect(res.headers.get("location") ?? "").toStartWith(location);
    }
    const canceled = await app.request(
      "/api/auth/google/callback?error=access_denied&state=s",
      { headers: { cookie: "oauth_state=s" } },
      googleEnv,
    );
    expect(canceled.headers.get("location") ?? "").toStartWith(
      "/login?error=se+cancel",
    );
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

test("project counts are exact and hide private tasks", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const stranger = await login(`stranger-${run}@x.test`);
  const team = key(8);
  await call(admin, "POST", "/api/teams", { key: team, name: "Counts" });
  const project = async (name: string, target_date: string | null) =>
    (
      await call(admin, "POST", `/api/teams/${team}/projects`, {
        name,
        target_date,
      })
    ).body as Project;
  const web = await project("Web", "2031-12-01");
  const funding = await project("Funding", null);
  const canceled = await project("Canceled only", "2031-12-01");
  await project("Empty", null);
  if (!web || !funding || !canceled) throw new Error("projects not created");
  const make = (project_id: string, fields: Record<string, unknown>) =>
    call(admin, "POST", "/api/tasks", {
      team,
      title: "t",
      project_id,
      ...fields,
    });
  await make(web.id, { status: "done" });
  await make(web.id, { status: "blocked", due_date: "2031-02-01" });
  await make(web.id, { due_date: "2020-01-01" });
  await make(web.id, { status: "canceled" });
  await make(web.id, { visibility: "private", due_date: "2019-01-01" });
  await make(funding.id, { due_date: "2031-05-01" });
  await make(funding.id, { status: "done", due_date: "2018-01-01" });
  await make(canceled.id, { status: "canceled" });

  const listed = async (who: Session) =>
    (await call(who, "GET", `/api/teams/${team}/projects`)).body as Project[];
  const byName = (projects: Project[], name: string) =>
    projects.find((p) => p.name === name);
  const asAdmin = await listed(admin);
  const asStranger = await listed(stranger);

  expect(byName(asAdmin, "Web")).toMatchObject({
    open: 3,
    progress: 0.25,
    next_due: "2019-01-01",
  });
  expect(byName(asStranger, "Web")).toMatchObject({
    open: 2,
    progress: 1 / 3,
    next_due: "2020-01-01",
  });
  expect(byName(asStranger, "Funding")).toMatchObject({
    open: 1,
    progress: 0.5,
    next_due: "2031-05-01",
  });
  expect(byName(asStranger, "Canceled only")).toMatchObject({
    open: 0,
    progress: 0,
    next_due: null,
  });
  expect(byName(asStranger, "Empty")).toMatchObject({
    open: 0,
    progress: 0,
    next_due: null,
  });
});

test("paging returns every task once and sets the cursor only when more remain", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(9);
  await call(admin, "POST", "/api/teams", { key: team, name: "Pages" });
  const due = [
    "2031-01-02",
    null,
    "2031-01-01",
    "2031-01-02",
    null,
    "2031-01-02",
    "2031-01-01",
    null,
  ];
  for (const [i, due_date] of due.entries()) {
    await call(admin, "POST", "/api/tasks", {
      team,
      title: `task ${i}`,
      due_date,
    });
  }
  const everything = await call(admin, "GET", `/api/tasks?team=${team}`);
  const expected = everything.body.map((t: Task) => t.key);
  expect(expected).toHaveLength(due.length);
  expect(everything.headers.get("x-next-cursor")).toBeNull();

  const walk = async (limit: number) => {
    const keys: string[] = [];
    const sizes: number[] = [];
    let cursor: string | null = null;
    do {
      const path: string = `/api/tasks?team=${team}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;
      const page = await call(admin, "GET", path);
      expect(page.status).toBe(200);
      keys.push(...page.body.map((t: Task) => t.key));
      sizes.push(page.body.length);
      cursor = page.headers.get("x-next-cursor");
    } while (cursor);
    return { keys, sizes };
  };
  expect(await walk(3)).toEqual({ keys: expected, sizes: [3, 3, 2] });
  expect(await walk(4)).toEqual({ keys: expected, sizes: [4, 4] });

  const rejected = [
    ["limit=0", "limit debe ser un entero de 1 a 500"],
    ["limit=501", "limit debe ser un entero de 1 a 500"],
    ["limit=abc", "limit debe ser un entero de 1 a 500"],
    ["cursor=garbage", "cursor no es válido"],
  ];
  for (const [query, error] of rejected) {
    const res = await call(admin, "GET", `/api/tasks?${query}`);
    expect([res.status, res.body.error]).toEqual([400, error]);
  }
});

test("task list filters compose: status, open and a due window all narrow", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(12);
  await call(admin, "POST", "/api/teams", { key: team, name: "Filters" });
  for (const [name, status, due_date] of [
    ["todo in window", "todo", "2031-01-01"],
    ["blocked in window", "blocked", "2031-01-02"],
    ["done in window", "done", "2031-01-01"],
    ["canceled in window", "canceled", "2031-01-02"],
    ["todo outside window", "todo", "2031-02-01"],
  ] as const) {
    const res = await call(admin, "POST", "/api/tasks", {
      team,
      title: name,
      status,
      due_date,
    });
    expect(res.status).toBe(201);
  }
  const titles = async (query: string) =>
    (await call(admin, "GET", `/api/tasks?team=${team}&${query}`)).body
      .map((t: Task) => t.title)
      .sort();
  const window = "due_after=2031-01-01&due_before=2031-01-02";

  // The status list names closed statuses, and open=1 rules them out.
  expect(
    await titles(`status=todo,blocked,done,canceled&open=1&${window}`),
  ).toEqual(["blocked in window", "todo in window"]);
  expect(await titles(`status=done&open=1&${window}`)).toEqual([]);
  // Each filter alone still works.
  expect(await titles(`status=done,canceled&${window}`)).toEqual([
    "canceled in window",
    "done in window",
  ]);
  expect(await titles(`open=1&${window}`)).toEqual([
    "blocked in window",
    "todo in window",
  ]);
});

test("the web client follows the cursor", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(10);
  await call(admin, "POST", "/api/teams", { key: team, name: "Client" });
  for (const i of [0, 1, 2, 3, 4]) {
    await call(admin, "POST", "/api/tasks", { team, title: `c${i}` });
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((path: string, init: RequestInit) =>
    app.request(
      path,
      { ...init, headers: { ...init.headers, cookie: admin.cookie } },
      env,
    )) as unknown as typeof fetch;
  try {
    const first = await api.tasksPage({ team, limit: "2" });
    expect(first.items).toHaveLength(2);
    expect(first.next).toBeString();
    const second = await api.tasksPage({ team, limit: "2" }, first.next ?? "");
    expect(second.items.map((t) => t.key)).not.toContain(first.items[0]?.key);
    const all = [...first.items, ...second.items];
    for (let page = second; page.next;) {
      page = await api.tasksPage({ team, limit: "2" }, page.next);
      all.push(...page.items);
    }
    expect(all).toHaveLength(5);
    expect(new Set(all.map((t) => t.key)).size).toBe(5);
    expect((await api.tasksPage({ team })).next).toBeNull();
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a malformed body gets a 400 in Spanish that names the field", async () => {
  const admin = await login(`admin-${run}@x.test`);
  const team = key(11);
  await call(admin, "POST", "/api/teams", { key: team, name: "Bad" });
  const cases: [string, string, string, unknown, string][] = [
    [
      "body is not an object",
      "POST",
      "/api/tasks",
      [],
      "el cuerpo debe ser un objeto JSON",
    ],
    ["title missing", "POST", "/api/tasks", { team }, "title es obligatorio"],
    [
      "title wrong type",
      "POST",
      "/api/tasks",
      { team, title: 5 },
      "title debe ser texto",
    ],
    [
      "title blank",
      "POST",
      "/api/tasks",
      { team, title: "  " },
      "title no puede estar vacío",
    ],
    [
      "title too long",
      "POST",
      "/api/tasks",
      { team, title: "x".repeat(301) },
      "title no puede superar 300 caracteres",
    ],
    [
      "status unknown",
      "POST",
      "/api/tasks",
      { team, title: "t", status: "x" },
      "status debe ser uno de: backlog, todo, in_progress, blocked, done, canceled",
    ],
    [
      "date impossible",
      "POST",
      "/api/tasks",
      { team, title: "t", due_date: "2031-02-31" },
      "due_date debe tener el formato AAAA-MM-DD o ser null",
    ],
    [
      "labels not a list",
      "POST",
      "/api/tasks",
      { team, title: "t", labels: "a" },
      "labels debe ser una lista de ids",
    ],
    [
      "team key shape",
      "POST",
      "/api/teams",
      { key: "1ab", name: "n" },
      "key debe tener de 2 a 6 letras o números y empezar con una letra",
    ],
    [
      "team name missing",
      "POST",
      "/api/teams",
      { key: "OKAY" },
      "name es obligatorio",
    ],
    [
      "event start",
      "POST",
      "/api/events",
      { title: "e", starts_at: "nope" },
      "starts_at debe ser una fecha y hora válida",
    ],
  ];
  const results = [];
  for (const [name, method, path, body] of cases) {
    const res = await call(admin, method, path, body);
    results.push([name, res.status, res.body.error]);
  }
  expect(results).toEqual(
    cases.map(([name, , , , error]) => [name, 400, error]),
  );
});
