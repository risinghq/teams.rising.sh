import { Hono } from "hono";
import {
  createEvent as createEventBody,
  dateRange,
  freeBusyQuery,
  patchEvent as patchEventBody,
} from "../../shared/schemas";
import type { CalEvent, FreeBusy } from "../../shared/types";
import type { Env } from "../env";
import { HttpError, id, parseBody, parseQuery, type C } from "../http";
import { calendarTasks, hydrate } from "../tasks/queries";
import { isTeamLeader } from "../teams/queries";
import { googleBusy, removeEvent, syncEvent } from "./gcal";
import {
  deleteEvent,
  findEvent,
  insertEvent,
  listEvents,
  setAttendees,
  teamIdByKey,
  teamsBusy,
  updateEvent,
} from "./queries";

function range(c: C) {
  const { from, to } = parseQuery(c, dateRange);
  return { from: from ?? null, to: to ?? null };
}

async function eventById(c: C, eventId: string): Promise<CalEvent> {
  const event = await findEvent(c.env.DB, eventId);
  if (!event) throw new HttpError(404, "evento no encontrado");
  return event;
}

async function requireEventEditor(c: C, event: CalEvent): Promise<void> {
  const user = c.get("user");
  if (user.is_admin || event.created_by === user.id) return;
  if (event.team_id && (await isTeamLeader(c.env.DB, event.team_id, user.id)))
    return;
  throw new HttpError(
    403,
    "solo quien creó el evento o un líder puede cambiarlo",
  );
}

export const eventRoutes = new Hono<Env>();

eventRoutes.get("/events", async (c) => {
  const { from, to } = range(c);
  return c.json(await listEvents(c.env.DB, from, to));
});

eventRoutes.post("/events", async (c) => {
  const user = c.get("user");
  const input = await parseBody(c, createEventBody);
  const teamId = input.team ? await teamIdByKey(c.env.DB, input.team) : null;
  if (input.team && !teamId) throw new HttpError(404, "equipo no encontrado");
  const eventId = id();
  await insertEvent(c.env.DB, {
    id: eventId,
    team_id: teamId,
    title: input.title,
    description: input.description,
    starts_at: input.starts_at,
    ends_at: input.ends_at ?? null,
    all_day: input.all_day ? 1 : 0,
    created_by: user.id,
  });
  await setAttendees(c.env.DB, eventId, input.attendees);
  await syncEvent(c.env, user.id, await eventById(c, eventId), input.meet);
  return c.json(await eventById(c, eventId), 201);
});

eventRoutes.patch("/events/:id", async (c) => {
  const event = await eventById(c, c.req.param("id"));
  await requireEventEditor(c, event);
  const input = await parseBody(c, patchEventBody);
  await updateEvent(c.env.DB, {
    id: event.id,
    title: input.title ?? event.title,
    description: input.description ?? event.description,
    starts_at: input.starts_at ?? event.starts_at,
    ends_at: input.ends_at === undefined ? event.ends_at : input.ends_at,
    all_day:
      input.all_day === undefined ? event.all_day : input.all_day ? 1 : 0,
  });
  if (input.attendees) await setAttendees(c.env.DB, event.id, input.attendees);
  await syncEvent(c.env, event.created_by, await eventById(c, event.id));
  return c.json(await eventById(c, event.id));
});

eventRoutes.delete("/events/:id", async (c) => {
  const event = await eventById(c, c.req.param("id"));
  await requireEventEditor(c, event);
  await deleteEvent(c.env.DB, event.id);
  await removeEvent(c.env, event.created_by, event);
  return c.json({ ok: true });
});

// Busy intervals only, never titles: what Google shows a colleague by default.
eventRoutes.get("/freebusy", async (c) => {
  const { users, from, to } = parseQuery(c, freeBusyQuery);
  const [google, teams] = await Promise.all([
    Promise.all(users.map((u) => googleBusy(c.env, u, from, to))),
    teamsBusy(c.env.DB, users, from, to),
  ]);
  const result: FreeBusy = {};
  users.forEach((userId, i) => {
    const own = teams
      .filter((r) => r.user_id === userId)
      .map((r) => ({
        start: new Date(r.starts_at).toISOString(),
        end: new Date(
          r.ends_at
            ? Date.parse(r.ends_at)
            : Date.parse(r.starts_at) + 3600_000,
        ).toISOString(),
      }));
    result[userId] = {
      busy: [...(google[i] ?? []), ...own],
      google: google[i] !== null,
    };
  });
  return c.json(result);
});

eventRoutes.get("/calendar", async (c) => {
  const user = c.get("user");
  const { from, to } = range(c);
  const [tasks, events] = await Promise.all([
    calendarTasks(c.env.DB, user, from, to),
    listEvents(c.env.DB, from, to),
  ]);
  return c.json({ tasks: await hydrate(c.env.DB, user, tasks), events });
});
