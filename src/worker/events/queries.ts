import type { CalEvent, Person } from "../../shared/types";

export type EventRow = Omit<CalEvent, "attendees">;

async function withAttendees(
  db: D1Database,
  rows: EventRow[],
): Promise<CalEvent[]> {
  if (rows.length === 0) return [];
  const marks = rows.map(() => "?").join(",");
  const people = await db
    .prepare(
      `SELECT a.event_id, u.id, u.name, u.avatar_url FROM event_attendees a
       JOIN users u ON u.id = a.user_id WHERE a.event_id IN (${marks})
       ORDER BY u.name`,
    )
    .bind(...rows.map((r) => r.id))
    .all<Person & { event_id: string }>();
  return rows.map((row) => ({
    ...row,
    attendees: people.results
      .filter((p) => p.event_id === row.id)
      .map(({ id, name, avatar_url }) => ({ id, name, avatar_url })),
  }));
}

export async function listEvents(
  db: D1Database,
  from: string | null,
  to: string | null,
) {
  const rows = await db
    .prepare(
      `SELECT * FROM events WHERE (? IS NULL OR substr(starts_at, 1, 10) >= ?)
         AND (? IS NULL OR substr(starts_at, 1, 10) <= ?) ORDER BY starts_at`,
    )
    .bind(from, from, to, to)
    .all<EventRow>();
  return withAttendees(db, rows.results);
}

export async function findEvent(db: D1Database, eventId: string) {
  const row = await db
    .prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first<EventRow>();
  return row ? ((await withAttendees(db, [row]))[0] ?? null) : null;
}

export async function teamIdByKey(
  db: D1Database,
  key: string,
): Promise<string | null> {
  const team = await db
    .prepare("SELECT id FROM teams WHERE key = ?")
    .bind(key.toUpperCase())
    .first<{ id: string }>();
  return team?.id ?? null;
}

export async function insertEvent(
  db: D1Database,
  event: Omit<EventRow, "google_event_id" | "meet_url">,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO events (id, team_id, title, description, starts_at, ends_at, all_day, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.team_id,
      event.title,
      event.description,
      event.starts_at,
      event.ends_at,
      event.all_day,
      event.created_by,
    )
    .run();
}

export async function updateEvent(
  db: D1Database,
  event: Pick<
    EventRow,
    "id" | "title" | "description" | "starts_at" | "ends_at" | "all_day"
  >,
): Promise<void> {
  await db
    .prepare(
      `UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, all_day = ? WHERE id = ?`,
    )
    .bind(
      event.title,
      event.description,
      event.starts_at,
      event.ends_at,
      event.all_day,
      event.id,
    )
    .run();
}

// Replaces the attendee list. An id that is not a person is skipped.
export async function setAttendees(
  db: D1Database,
  eventId: string,
  userIds: string[],
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM event_attendees WHERE event_id = ?").bind(eventId),
    ...[...new Set(userIds)].map((userId) =>
      db
        .prepare(
          `INSERT INTO event_attendees (event_id, user_id)
           SELECT ?, id FROM users WHERE id = ?`,
        )
        .bind(eventId, userId),
    ),
  ]);
}

export async function deleteEvent(
  db: D1Database,
  eventId: string,
): Promise<void> {
  await db.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
}

export async function setGoogleIds(
  db: D1Database,
  eventId: string,
  googleId: string,
  meetUrl: string | null,
): Promise<void> {
  await db
    .prepare(
      "UPDATE events SET google_event_id = ?, meet_url = coalesce(?, meet_url) WHERE id = ?",
    )
    .bind(googleId, meetUrl, eventId)
    .run();
}

export async function emailsOf(
  db: D1Database,
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .prepare(
      `SELECT email FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`,
    )
    .bind(...userIds)
    .all<{ email: string }>();
  return rows.results.map((r) => r.email);
}

// The timed Teams events each person created or attends that overlap the
// range. An event without an end lasts an hour, as in Google.
export async function teamsBusy(
  db: D1Database,
  userIds: string[],
  from: string,
  to: string,
): Promise<{ user_id: string; starts_at: string; ends_at: string | null }[]> {
  const start = Date.parse(from);
  const end = Date.parse(to);
  // A day either side, since a stored time may carry another offset.
  const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const marks = userIds.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT p.user_id, e.starts_at, e.ends_at FROM events e
       JOIN (SELECT id AS event_id, created_by AS user_id FROM events
             UNION SELECT event_id, user_id FROM event_attendees) p
         ON p.event_id = e.id
       WHERE e.all_day = 0 AND p.user_id IN (${marks})
         AND substr(e.starts_at, 1, 10) BETWEEN ? AND ?`,
    )
    .bind(...userIds, dayOf(start - 86400_000), dayOf(end + 86400_000))
    .all<{ user_id: string; starts_at: string; ends_at: string | null }>();
  return rows.results.filter((r) => {
    const s = Date.parse(r.starts_at);
    const e = r.ends_at ? Date.parse(r.ends_at) : s + 3600_000;
    return s < end && e > start;
  });
}
