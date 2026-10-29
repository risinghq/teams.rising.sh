import { Hono } from "hono";
import type { Env } from "./env";
import { HttpError, id } from "./http";

export type LinkSpec = {
  kind: "pull_request" | "issue" | "branch" | "commit";
  repo: string;
  externalId: string;
  url: string;
  title: string;
  state: string;
  keys: string[];
};

type Json = Record<string, any>;

const KEY = /\b([A-Z][A-Z0-9]{1,9})-(\d+)\b/g;

// Task keys named in the texts, in order of first appearance, without repeats.
export function taskKeys(...texts: (string | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const t of texts) {
    for (const m of (t ?? "").matchAll(KEY)) found.add(m[0]);
  }
  return [...found];
}

// The git objects an event names. Events that carry no linkable object give [].
export function linksFromEvent(event: string, p: Json): LinkSpec[] {
  const repo: string = p.repository?.full_name ?? "";
  if (event === "pull_request" && p.pull_request) {
    const pr = p.pull_request;
    return [
      {
        kind: "pull_request",
        repo,
        externalId: String(pr.number),
        url: pr.html_url,
        title: pr.title,
        state: pr.merged ? "merged" : pr.state,
        keys: taskKeys(pr.title, pr.head?.ref, pr.body),
      },
    ];
  }
  if (event === "issues" && p.issue) {
    const issue = p.issue;
    return [
      {
        kind: "issue",
        repo,
        externalId: String(issue.number),
        url: issue.html_url,
        title: issue.title,
        state: issue.state,
        keys: taskKeys(issue.title, issue.body),
      },
    ];
  }
  if (event === "push" && !p.deleted) {
    const specs: LinkSpec[] = [];
    const branch = String(p.ref ?? "").replace(/^refs\/heads\//, "");
    const branchKeys = taskKeys(branch);
    if (p.ref?.startsWith("refs/heads/") && branchKeys.length > 0) {
      specs.push({
        kind: "branch",
        repo,
        externalId: branch,
        url: `${p.repository.html_url}/tree/${branch}`,
        title: branch,
        state: "open",
        keys: branchKeys,
      });
    }
    for (const c of p.commits ?? []) {
      const keys = taskKeys(c.message);
      if (keys.length === 0) continue;
      specs.push({
        kind: "commit",
        repo,
        externalId: c.id,
        url: c.url,
        title: String(c.message).split("\n")[0] ?? "",
        state: "open",
        keys,
      });
    }
    return specs;
  }
  return [];
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function validSignature(
  secret: string,
  raw: string,
  header: string | undefined,
): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
  );
  const given = header.slice("sha256=".length);
  if (given.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++)
    diff |= mac.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function taskIdForKeys(db: D1Database, keys: string[]) {
  for (const k of keys) {
    const dash = k.lastIndexOf("-");
    const row = await db
      .prepare(
        `SELECT t.id FROM tasks t JOIN teams tm ON tm.id = t.team_id
         WHERE tm.key = ? AND t.number = ?`,
      )
      .bind(k.slice(0, dash), Number(k.slice(dash + 1)))
      .first<{ id: string }>();
    if (row) return row.id;
  }
  return null;
}

// Links the object to the first task its texts name. A change of state is
// written to the task's activity.
async function applyLink(db: D1Database, spec: LinkSpec) {
  const taskId = await taskIdForKeys(db, spec.keys);
  if (!taskId) return false;
  const before = await db
    .prepare(
      `SELECT state FROM task_links
       WHERE provider = 'github' AND repo = ? AND kind = ? AND external_id = ?`,
    )
    .bind(spec.repo, spec.kind, spec.externalId)
    .first<{ state: string }>();
  await db
    .prepare(
      `INSERT INTO task_links (id, task_id, kind, repo, external_id, url, title, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (provider, repo, kind, external_id)
       DO UPDATE SET url = excluded.url, title = excluded.title, state = excluded.state`,
    )
    .bind(
      id(),
      taskId,
      spec.kind,
      spec.repo,
      spec.externalId,
      spec.url,
      spec.title,
      spec.state,
    )
    .run();
  if (spec.kind !== "commit" && before?.state !== spec.state) {
    await db
      .prepare(
        "INSERT INTO task_updates (id, task_id, kind, body, meta) VALUES (?, ?, 'link', ?, ?)",
      )
      .bind(
        id(),
        taskId,
        `${spec.kind.replace("_", " ")} ${spec.state}: ${spec.title}`,
        JSON.stringify({ url: spec.url, repo: spec.repo, state: spec.state }),
      )
      .run();
  }
  return true;
}

export const githubRoutes = new Hono<Env>();

githubRoutes.post("/github", async (c) => {
  const secret = c.env.GITHUB_WEBHOOK_SECRET;
  if (!secret)
    return c.json({ error: "github webhook is not configured" }, 503);
  const raw = await c.req.text();
  if (!(await validSignature(secret, raw, c.req.header("x-hub-signature-256"))))
    throw new HttpError(401, "bad signature");
  const event = c.req.header("x-github-event") ?? "";
  let payload: Json;
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
