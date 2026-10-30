import type { CalEvent } from "../../shared/types";
import { refreshTokenOf } from "../auth/queries";
import type { Env } from "../env";
import { emailsOf, setGoogleIds } from "./queries";

type Bindings = Env["Bindings"];

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

async function accessToken(env: Bindings, userId: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const refreshToken = await refreshTokenOf(env.DB, userId);
  if (!refreshToken) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { access_token: string }).access_token;
}

// Google wants a plain date for an all-day event, and its end date is exclusive.
function when(event: CalEvent) {
  if (!event.all_day) {
    const start = Date.parse(event.starts_at);
    const end = event.ends_at ? Date.parse(event.ends_at) : start + 3600_000;
    return {
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    };
  }
  const last = Date.parse((event.ends_at ?? event.starts_at).slice(0, 10));
  return {
    start: { date: event.starts_at.slice(0, 10) },
    end: { date: new Date(last + 86400_000).toISOString().slice(0, 10) },
  };
}

type Sent = { id: string; hangoutLink?: string };

// `conferenceDataVersion=1` lets the body ask for a Meet, and `sendUpdates`
// mails the attendees an invitation, a change or a cancellation.
function eventUrl(googleId: string | null) {
  const url = new URL(googleId ? `${EVENTS_URL}/${googleId}` : EVENTS_URL);
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "all");
  return url.toString();
}

function eventBody(event: CalEvent, emails: string[], meet: boolean) {
  return {
    summary: event.title,
    description: event.description,
    ...when(event),
    attendees: emails.map((email) => ({ email })),
    // The request id makes a retried create return the same meeting.
    ...(meet && {
      conferenceData: {
        createRequest: {
          requestId: event.id,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  };
}

async function send(
  env: Bindings,
  userId: string,
  method: "POST" | "PATCH" | "DELETE",
  googleId: string | null,
  body?: object,
): Promise<Sent | null> {
  const token = await accessToken(env, userId);
  if (!token) return null;
  const res = await fetch(eventUrl(googleId), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return null;
  return method === "DELETE" ? null : ((await res.json()) as Sent);
}

// Mirrors the event to its creator's primary Google calendar and invites its
// attendees from there. `meet` asks Google for a Meet link once. A failure is
// logged and leaves the event as it is: Teams stays the source of truth.
export async function syncEvent(
  env: Bindings,
  userId: string,
  event: CalEvent,
  meet = false,
) {
  try {
    const emails = await emailsOf(
      env.DB,
      event.attendees.map((a) => a.id),
    );
    const sent = await send(
      env,
      userId,
      event.google_event_id ? "PATCH" : "POST",
      event.google_event_id,
      eventBody(event, emails, meet && !event.meet_url),
    );
    if (sent)
      await setGoogleIds(env.DB, event.id, sent.id, sent.hangoutLink ?? null);
  } catch (err) {
    console.error("google calendar sync failed", err);
  }
}

// The person's busy intervals in their Google calendars, or null when they
// have not connected Google or Google refuses.
export async function googleBusy(
  env: Bindings,
  userId: string,
  from: string,
  to: string,
): Promise<{ start: string; end: string }[] | null> {
  try {
    const token = await accessToken(env, userId);
    if (!token) return null;
    const res = await fetch(FREEBUSY_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        items: [{ id: "primary" }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    };
    return data.calendars.primary?.busy ?? [];
  } catch (err) {
    console.error("google free/busy failed", err);
    return null;
  }
}

export async function removeEvent(
  env: Bindings,
  userId: string,
  event: CalEvent,
) {
  if (!event.google_event_id) return;
  try {
    await send(env, userId, "DELETE", event.google_event_id);
  } catch (err) {
    console.error("google calendar delete failed", err);
  }
}
