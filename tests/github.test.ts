import { afterAll, beforeAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../src/worker/index";
import { taskKeys, validSignature } from "../src/worker/github";

const SECRET = "hook-secret";
let mf: Miniflare;
let env: Record<string, unknown>;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('') } }",
    d1Databases: { DB: "hooks" },
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
    GITHUB_WEBHOOK_SECRET: SECRET,
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

async function hook(event: string, payload: unknown, secret = SECRET) {
  const raw = JSON.stringify(payload);
  const res = await app.request(
    "/hooks/github",
    {
      method: "POST",
      headers: {
        "x-github-event": event,
        "x-hub-signature-256": await sign(raw, secret),
      },
      body: raw,
    },
    env,
  );
  return { status: res.status, body: (await res.json()) as any };
}

async function seedTask() {
  const login = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email: "a@x.test", name: "A" }) },
    env,
  );
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  const call = async (method: string, path: string, json?: unknown) =>
    (
      await app.request(
        path,
        {
          method,
          headers: { cookie },
          body: json === undefined ? undefined : JSON.stringify(json),
        },
        env,
      )
    ).json() as Promise<any>;
  await call("POST", "/api/teams", { key: "GIT", name: "Git" });
  const task = await call("POST", "/api/tasks", { team: "GIT", title: "wire" });
  return { call, key: task.key as string };
}

const repository = {
  full_name: "risinghq/app",
  html_url: "https://github.com/risinghq/app",
};

test("task keys are found once each, in order", () => {
  expect(
    taskKeys("ENG-12: fix", "feature/ops-3", "closes ENG-12 and OPS-3"),
  ).toEqual(["ENG-12", "OPS-3"]);
  expect(taskKeys("ABC-", "x-1")).toEqual([]);
});

test("a signature must match the body and the secret", async () => {
  expect(await validSignature(SECRET, "{}", await sign("{}"))).toBe(true);
  expect(await validSignature(SECRET, "{}", await sign("{}", "other"))).toBe(
    false,
  );
  expect(await validSignature(SECRET, "{}", undefined)).toBe(false);
});

test("a pull request links to its task and its merge reaches the activity", async () => {
  const { call, key } = await seedTask();
  const pr = (state: string, merged: boolean) => ({
    repository,
    pull_request: {
      number: 7,
      title: `${key}: add the hook`,
      body: "",
      state,
      merged,
      html_url: "https://github.com/risinghq/app/pull/7",
      head: { ref: "wire-hook" },
    },
  });
  expect((await hook("pull_request", pr("open", false))).body.linked).toBe(1);
  expect((await hook("pull_request", pr("closed", true))).body.linked).toBe(1);
  const task = await call("GET", `/api/tasks/${key}`);
  expect(task.links).toHaveLength(1);
  expect(task.links[0]).toMatchObject({
    kind: "pull_request",
    state: "merged",
  });
  const states = task.updates
    .filter((u: any) => u.kind === "link")
    .map((u: any) => u.body);
  expect(states).toHaveLength(2);
  expect(states.at(-1)).toContain("merged");
});

test("a push links its branch and the commits that name a task", async () => {
  const { call, key } = await seedTask();
  const res = await hook("push", {
    repository,
    ref: `refs/heads/${key.toLowerCase()}-hook`.replace(key.toLowerCase(), key),
    commits: [
      { id: "a1", url: "u1", message: `${key} first\n\nbody` },
      { id: "b2", url: "u2", message: "no task here" },
    ],
  });
  expect(res.body.linked).toBe(2);
  const kinds = (await call("GET", `/api/tasks/${key}`)).links.map(
    (l: any) => l.kind,
  );
  expect(kinds.sort()).toEqual(["branch", "commit"]);
});

test("an unknown key links nothing and a bad signature is refused", async () => {
  expect(
    (
      await hook("issues", {
        repository,
        issue: {
          number: 1,
          title: "NOPE-99 x",
          body: "",
          state: "open",
          html_url: "u",
        },
      })
    ).body.linked,
  ).toBe(0);
  expect(
    (await hook("push", { repository, ref: "refs/heads/x" }, "wrong")).status,
  ).toBe(401);
});
