import {
  afterAll,
  afterEach,
  beforeAll,
  expect,
  test,
  setDefaultTimeout,
} from "bun:test";
import type { Miniflare } from "miniflare";
import app from "../src/worker/index";
import { HOST_TIMEOUT, migratedDb } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let DB: D1Database;
let env: Record<string, unknown>;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  ({ mf, DB } = await migratedDb("gcal"));
  env = {
    DB,
    ASSETS: { fetch: () => new Response("asset") },
    DEV_LOGIN: "1",
    GOOGLE_CLIENT_ID: "cid",
    GOOGLE_CLIENT_SECRET: "csecret",
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

afterAll(() => mf.dispose());

type Sent = { url: string; method: string; body: any };

// Answers Google's two endpoints and records what the worker sent.
function fakeGoogle(status = 200) {
  const sent: Sent[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "at" });
    sent.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    });
    return status === 200
      ? Response.json({ id: "g1" })
      : new Response("no", { status });
  }) as typeof fetch;
  return sent;
}

async function signIn(email: string, withToken: boolean) {
  const login = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email, name: email }) },
    env,
  );
  const { id } = (await login.json()) as { id: string };
  if (withToken)
    await DB.prepare(
      "INSERT INTO google_tokens (user_id, refresh_token) VALUES (?, 'rt')",
    )
      .bind(id)
      .run();
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return async (method: string, path: string, json?: unknown) => {
    const res = await app.request(
      path,
      {
        method,
        headers: { cookie },
        body: json === undefined ? undefined : JSON.stringify(json),
      },
      env,
    );
    return { status: res.status, body: (await res.json()) as any };
  };
}

test("an event is created, moved and removed in the creator's Google calendar", async () => {
  const call = await signIn("a@x.test", true);
  const sent = fakeGoogle();
  const created = await call("POST", "/api/events", {
    title: "Dock inspection",
    starts_at: "2026-11-02T14:00:00Z",
    ends_at: "2026-11-02T15:30:00Z",
  });
  expect(created.status).toBe(201);
  expect(created.body.google_event_id).toBe("g1");
  expect(sent[0]).toMatchObject({ method: "POST" });
  expect(sent[0]!.body.summary).toBe("Dock inspection");
  expect(sent[0]!.body.end.dateTime).toBe("2026-11-02T15:30:00.000Z");

  await call("PATCH", `/api/events/${created.body.id}`, { title: "Dock" });
  expect(sent[1]).toMatchObject({ method: "PUT" });
  expect(sent[1]!.url).toEndWith("/events/g1");

  await call("DELETE", `/api/events/${created.body.id}`);
  expect(sent[2]).toMatchObject({ method: "DELETE" });
});

test("an all-day event ends on the day after its last day", async () => {
  const call = await signIn("b@x.test", true);
  const sent = fakeGoogle();
  await call("POST", "/api/events", {
    title: "Offsite",
    starts_at: "2026-11-03",
    ends_at: "2026-11-04",
    all_day: true,
  });
  expect(sent[0]!.body.start).toEqual({ date: "2026-11-03" });
  expect(sent[0]!.body.end).toEqual({ date: "2026-11-05" });
});

test("a Google failure or a missing token still saves the event", async () => {
  const noToken = await signIn("c@x.test", false);
  const sent = fakeGoogle();
  const local = await noToken("POST", "/api/events", {
    title: "Local",
    starts_at: "2026-11-02T10:00:00Z",
  });
  expect(local.status).toBe(201);
  expect(local.body.google_event_id).toBeNull();
  expect(sent).toHaveLength(0);

  const withToken = await signIn("d@x.test", true);
  fakeGoogle(500);
  const failed = await withToken("POST", "/api/events", {
    title: "Rejected",
    starts_at: "2026-11-02T10:00:00Z",
  });
  expect(failed.status).toBe(201);
  expect(failed.body.google_event_id).toBeNull();
});
