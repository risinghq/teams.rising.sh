import type { CalEvent } from "../../shared/types";

export function listEvents(
  db: D1Database,
  from: string | null,
  to: string | null,
) {
  return db
    .prepare(
      `SELECT * FROM events WHERE (? IS NULL OR substr(starts_at, 1, 10) >= ?)
         AND (? IS NULL OR substr(starts_at, 1, 10) <= ?) ORDER BY starts_at`,
    )
    .bind(from, from, to, to)
    .all<CalEvent>()
    .then((r) => r.results);
}

export function findEvent(db: D1Database, eventId: string) {
  return db
    .prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first<CalEvent>();
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
  event: Omit<CalEvent, "google_event_id">,
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
    CalEvent,
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

export async function deleteEvent(
  db: D1Database,
  eventId: string,
): Promise<void> {
  await db.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
}

export async function setGoogleEventId(
  db: D1Database,
  eventId: string,
  googleId: string,
): Promise<void> {
  await db
    .prepare("UPDATE events SET google_event_id = ? WHERE id = ?")
    .bind(googleId, eventId)
    .run();
}
