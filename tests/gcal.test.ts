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
let calendarIds = 0;

// Answers Google's endpoints and records what the worker sent: event and
// free/busy calls in the array, calendar creations in `calendars`. A request
// that asks for a Meet gets a link back; free/busy answers with `busy`. An
// event sent to a calendar in `gone` gets a 404, as for a deleted calendar.
function fakeGoogle(
  status = 200,
  busy: { start: string; end: string }[] = [],
  gone: string[] = [],
) {
  const sent = Object.assign([] as Sent[], { calendars: [] as Sent[] });
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "at" });
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    const call = { url: String(url), method: init?.method ?? "GET", body };
    if (new URL(call.url).pathname.endsWith("/calendars")) {
      sent.calendars.push(call);
      return Response.json({ id: `cal${++calendarIds}` });
    }
    sent.push(call);
    if (status !== 200) return new Response("no", { status });
    if (gone.some((id) => call.url.includes(`/calendars/${id}/`)))
      return new Response("gone", { status: 404 });
    if (String(url).endsWith("/freeBusy"))
      return Response.json({ calendars: { primary: { busy } } });
    return Response.json({
      // A change keeps the event's id, as Google does.
      id:
        call.method === "PATCH"
          ? new URL(call.url).pathname.split("/").pop()
          : `g${++googleIds}`,
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
  return Object.assign(call, { id, cookie });
}

test("a grant stored before scopes were recorded is reviewed and revoked", async () => {
  const old = await signIn("k@x.test", true);
  const none = await signIn("l@x.test", false);
  const narrow = await signIn("m@x.test", true);
  await DB.prepare(
    `UPDATE google_tokens SET scope = 'openid https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.freebusy'
     WHERE user_id = ?`,
  )
    .bind(narrow.id)
    .run();
  expect((await old("GET", "/api/me")).body.google_review).toBe(true);
  expect((await none("GET", "/api/me")).body.google_review).toBe(false);
  expect((await narrow("GET", "/api/me")).body.google_review).toBe(false);

  const revoked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    revoked.push(`${url} ${String(init?.body)}`);
    return new Response("{}");
  }) as typeof fetch;
  const res = await app.request(
    "/api/auth/google/review",
    { method: "POST", headers: { cookie: old.cookie } },
    env,
  );
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("/api/auth/google");
  expect(revoked).toEqual(["https://oauth2.googleapis.com/revoke token=rt"]);

  const anonymous = await app.request(
    "/api/auth/google/review",
    { method: "POST" },
    env,
  );
  expect(anonymous.headers.get("location")).toBe("/login");
});

test("the sign-in asks for no sensitive calendar scope", async () => {
  const res = await app.request("/api/auth/google", {}, env);
  const scopes = new URL(res.headers.get("location") ?? "").searchParams
    .get("scope")
    ?.split(" ");
  expect(scopes).toEqual([
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.app.created",
    "https://www.googleapis.com/auth/calendar.freebusy",
  ]);
});

test("the old privacy address sends people to the rising.sh policy", async () => {
  const res = await app.request("/privacidad", {}, env);
  expect(res.status).toBe(301);
  expect(res.headers.get("location")).toBe("https://rising.sh/privacy/");
});

test("an event is created, moved and removed in the creator's Teams calendar", async () => {
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
  expect(sent.calendars).toHaveLength(1);
  expect(sent.calendars[0]!.body).toEqual({ summary: "Teams" });
  const calendarId = created.body.google_calendar_id;
  expect(calendarId).toMatch(/^cal\d+$/);
  expect(new URL(sent[0]!.url).pathname).toEndWith(
    `/calendars/${calendarId}/events`,
  );
  expect(sent[0]).toMatchObject({ method: "POST" });
  expect(sent[0]!.body.summary).toBe("Dock inspection");
  expect(sent[0]!.body.end.dateTime).toBe("2026-11-02T15:30:00.000Z");

  await call("PATCH", `/api/events/${created.body.id}`, { title: "Dock" });
  expect(sent[1]).toMatchObject({ method: "PATCH" });
  expect(new URL(sent[1]!.url).pathname).toEndWith(
    `/calendars/${calendarId}/events/${googleId}`,
  );

  // The second event reuses the Teams calendar.
  await call("POST", "/api/events", {
    title: "Second",
    starts_at: "2026-11-03T14:00:00Z",
  });
  expect(sent.calendars).toHaveLength(1);
  expect(new URL(sent[2]!.url).pathname).toEndWith(
    `/calendars/${calendarId}/events`,
  );

  await call("DELETE", `/api/events/${created.body.id}`);
  expect(sent[3]).toMatchObject({ method: "DELETE" });
  expect(new URL(sent[3]!.url).pathname).toEndWith(
    `/calendars/${calendarId}/events/${googleId}`,
  );
});

test("a Teams calendar deleted in Google is made again", async () => {
  const call = await signIn("i@x.test", true);
  fakeGoogle();
  const first = await call("POST", "/api/events", {
    title: "First",
    starts_at: "2026-11-02T14:00:00Z",
  });
  const old = first.body.google_calendar_id;
  const sent = fakeGoogle(200, [], [old]);
  const second = await call("POST", "/api/events", {
    title: "Second",
    starts_at: "2026-11-03T14:00:00Z",
  });
  expect(sent.calendars).toHaveLength(1);
  expect(second.body.google_calendar_id).not.toBe(old);
  expect(second.body.google_event_id).toMatch(/^g\d+$/);
  expect(sent).toHaveLength(2);
});

test("an event mirrored before the Teams calendar stays in the primary calendar", async () => {
  const call = await signIn("j@x.test", true);
  fakeGoogle(500);
  const created = await call("POST", "/api/events", {
    title: "Legacy",
    starts_at: "2026-11-02T14:00:00Z",
  });
  await DB.prepare(
    "UPDATE events SET google_event_id = 'legacy1', google_calendar_id = 'primary' WHERE id = ?",
  )
    .bind(created.body.id)
    .run();
  const sent = fakeGoogle();
  await call("PATCH", `/api/events/${created.body.id}`, { title: "Legacy 2" });
  expect(new URL(sent[0]!.url).pathname).toEndWith(
    "/calendars/primary/events/legacy1",
  );
  expect(sent.calendars).toHaveLength(0);
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
