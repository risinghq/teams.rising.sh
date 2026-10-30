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

// Google ids are unique across the file, as the events table requires.
let googleIds = 0;

// Answers Google's endpoints and records what the worker sent. A request that
// asks for a Meet gets a link back; free/busy answers with `busy`.
function fakeGoogle(status = 200, busy: { start: string; end: string }[] = []) {
  const sent: Sent[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "at" });
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    sent.push({ url: String(url), method: init?.method ?? "GET", body });
    if (status !== 200) return new Response("no", { status });
    if (String(url).endsWith("/freeBusy"))
      return Response.json({ calendars: { primary: { busy } } });
    return Response.json({
      id: `g${++googleIds}`,
      ...(body?.conferenceData && {
        hangoutLink: "https://meet.google.com/abc",
      }),
    });
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
  const call = async (method: string, path: string, json?: unknown) => {
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
  return Object.assign(call, { id });
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
  const googleId = created.body.google_event_id;
  expect(googleId).toMatch(/^g\d+$/);
  expect(sent[0]).toMatchObject({ method: "POST" });
  expect(sent[0]!.body.summary).toBe("Dock inspection");
  expect(sent[0]!.body.end.dateTime).toBe("2026-11-02T15:30:00.000Z");

  await call("PATCH", `/api/events/${created.body.id}`, { title: "Dock" });
  expect(sent[1]).toMatchObject({ method: "PATCH" });
  expect(new URL(sent[1]!.url).pathname).toEndWith(`/events/${googleId}`);

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

test("attendees are invited and a Meet link is kept", async () => {
  const call = await signIn("e@x.test", true);
  const guest = await signIn("f@x.test", false);
  const sent = fakeGoogle();
  const created = await call("POST", "/api/events", {
    title: "Planning",
    starts_at: "2026-11-02T14:00:00Z",
    attendees: [guest.id, "nobody"],
    meet: true,
  });
  expect(created.body.meet_url).toBe("https://meet.google.com/abc");
  expect(created.body.attendees.map((a: any) => a.id)).toEqual([guest.id]);
  expect(sent[0]!.body.attendees).toEqual([{ email: "f@x.test" }]);
  expect(sent[0]!.body.conferenceData.createRequest.requestId).toBe(
    created.body.id,
  );
  const url = new URL(sent[0]!.url);
  expect(url.searchParams.get("conferenceDataVersion")).toBe("1");
  expect(url.searchParams.get("sendUpdates")).toBe("all");

  // A later change keeps the meeting instead of asking for another.
  const moved = await call("PATCH", `/api/events/${created.body.id}`, {
    title: "Planning Q1",
  });
  expect(sent[1]!.body.conferenceData).toBeUndefined();
  expect(moved.body.meet_url).toBe("https://meet.google.com/abc");
});

test("free/busy joins Google's busy times with Teams events", async () => {
  const host = await signIn("g@x.test", true);
  const local = await signIn("h@x.test", false);
  fakeGoogle();
  await host("POST", "/api/events", {
    title: "Sync",
    starts_at: "2026-11-05T15:00:00Z",
    ends_at: "2026-11-05T15:30:00Z",
    attendees: [local.id],
  });
  const googleBusy = [
    { start: "2026-11-05T13:00:00Z", end: "2026-11-05T14:00:00Z" },
  ];
  const sent = fakeGoogle(200, googleBusy);
  const res = await host(
    "GET",
    `/api/freebusy?users=${host.id},${local.id}&from=2026-11-05T00:00:00Z&to=2026-11-06T00:00:00Z`,
  );
  expect(res.status).toBe(200);
  const sync = {
    start: "2026-11-05T15:00:00.000Z",
    end: "2026-11-05T15:30:00.000Z",
  };
  expect(res.body[host.id]).toEqual({
    google: true,
    busy: [...googleBusy, sync],
  });
  expect(res.body[local.id]).toEqual({ google: false, busy: [sync] });
  expect(sent.filter((s) => s.url.endsWith("/freeBusy"))).toHaveLength(1);

  const tooLong = await host(
    "GET",
    `/api/freebusy?users=${host.id}&from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z`,
  );
  expect(tooLong.status).toBe(400);
});
