import type { Env } from "./env";

type Bindings = Env["Bindings"];

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  google_event_id: string | null;
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function accessToken(env: Bindings, userId: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const row = await env.DB.prepare(
    "SELECT refresh_token FROM google_tokens WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ refresh_token: string }>();
  if (!row) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { access_token: string }).access_token;
}

// Google wants a plain date for an all-day event, and its end date is exclusive.
function when(event: CalendarEvent) {
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

async function send(
  env: Bindings,
  userId: string,
  method: "POST" | "PUT" | "DELETE",
  googleId: string | null,
  event?: CalendarEvent,
): Promise<string | null> {
  const token = await accessToken(env, userId);
  if (!token) return null;
  const res = await fetch(googleId ? `${EVENTS_URL}/${googleId}` : EVENTS_URL, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: event
      ? JSON.stringify({
          summary: event.title,
          description: event.description,
          ...when(event),
        })
      : undefined,
  });
  if (!res.ok) return null;
  return method === "DELETE"
    ? googleId
    : ((await res.json()) as { id: string }).id;
}

// Mirrors the event to its creator's primary Google calendar. A failure is
// logged and leaves the event as it is: Teams stays the source of truth.
export async function syncEvent(
  env: Bindings,
  userId: string,
  event: CalendarEvent,
) {
  try {
    const googleId = await send(
      env,
      userId,
      event.google_event_id ? "PUT" : "POST",
      event.google_event_id,
      event,
    );
    if (googleId && googleId !== event.google_event_id) {
      await env.DB.prepare("UPDATE events SET google_event_id = ? WHERE id = ?")
        .bind(googleId, event.id)
        .run();
    }
  } catch (err) {
    console.error("google calendar sync failed", err);
  }
}

export async function removeEvent(
  env: Bindings,
  userId: string,
  event: CalendarEvent,
) {
  if (!event.google_event_id) return;
  try {
    await send(env, userId, "DELETE", event.google_event_id);
  } catch (err) {
    console.error("google calendar delete failed", err);
  }
}
