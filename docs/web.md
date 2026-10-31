# Web client

A React single-page app in `src/web`, served by the worker's static assets. It
shows what the API returns and computes none of it: project counts, task filters
and paging are the server's.

## Run it locally

1. Put `DEV_LOGIN=1` in `.dev.vars`.
2. `bun run db:migrate:local` and `bun run db:seed:local`.
3. `bunx wrangler dev --port 8787` for the API.
4. `bun run dev` for the app. Vite proxies `/api` to port 8787. Set `API_PORT`
   when the worker runs on another port.
5. Sign in with `POST /api/auth/dev` and a JSON body `{"email": "..."}`.

## Routes

| Path                | Screen                                                  |
| ------------------- | ------------------------------------------------------- |
| `/`                 | Mi trabajo: greeting, quick create, shortcuts, my tasks |
| `/inbox`            | Bandeja: one row per task; opening the task reads it    |
| `/calendar`         | Calendario, by month or week                            |
| `/overview`         | Resumen by team and by person                           |
| `/t/$team`          | A team's projects and tasks                             |
| `/t/$team/$number`  | One task as a page                                      |
| `/t/$team/settings` | Team settings                                           |
| `/teams/new`        | New team                                                |
| `/perfil`           | Perfil: picture, name, username, WhatsApp number        |
| `/login`            | Sign in                                                 |
| `/privacidad`       | Privacy                                                 |
| `/terminos`         | Terms                                                   |

Every screen is its own chunk, fetched when its route first matches or when a
link to it is hovered or focused. An unknown path shows "Página no encontrada".

## State in the URL

What defines a view is in the search string, so a view can be shared, opened in
another tab and left with the back button. Each route's parser drops a value
that is unknown or equal to the default.

| Param     | Routes          | Meaning                                   |
| --------- | --------------- | ----------------------------------------- |
| `status`  | `/`, `/t/$team` | One status                                |
| `due`     | `/`             | `overdue` or `week`, both over open tasks |
| `label`   | `/`, `/t/$team` | One label id                              |
| `q`       | `/`, `/t/$team` | Text in the title or key                  |
| `view`    | `/`, `/t/$team` | `board`; the list is the default          |
| `task`    | `/`, `/t/$team` | The task open in the side panel           |
| `owner`   | `/t/$team`      | A person id or `none`                     |
| `project` | `/t/$team`      | A project id                              |
| `mode`    | `/calendar`     | `week`; the month is the default          |
| `date`    | `/calendar`     | A day other than today                    |

The filter bar holds only what the page does not already offer: search, owner
(team page), status, label (when the team has labels) and the view. A list is
grouped by due date, Mi trabajo's shortcut cards set and clear `due` and
`status=blocked`, and a project card sets `project`.

A comment or description shows its URLs as links and an image URL as a thumbnail
under the text. An image pasted or dropped into the comment box is uploaded and
its full URL added to the text on its own line, since only absolute URLs become
links.

A task row is a link to `/t/$team/$number`. A plain click opens the side panel
on wide screens; a modified click, or a narrow screen, goes to the page.

## Data

- `src/web/api.ts` is the HTTP client. It has no labels and no business rules.
- `src/web/lib/domain.ts` owns the Spanish labels for status and roles.
- `src/web/lib/tasks.ts` `taskQuery` turns a list's filters into the
  `GET /api/tasks` query. `due=overdue` means open and due before today;
  `due=week` means open and due from today to seven days ahead.
- A team's task list and Mi trabajo load pages of 50 with `useInfiniteQuery` and
  fetch the next page when the end scrolls into view.
- Project cards show `open`, `progress` and `next_due` from
  `GET /api/teams/:key/projects`.
- `src/web/lib/invalidation.ts` lists the queries each write makes stale. A task
  write refetches every page of every loaded list and the project counts.

## Writes and feedback

A write that changes something that already exists shows the change before the
server answers: a task field, a board or calendar drag, a reaction, a comment, a
collaborator, a project, a team, a member, the profile, a deleted event.
`src/web/lib/optimistic.ts` holds one patch builder per write, and
`useWrite(name, write, { optimistic })` applies it. A failure puts the cache
back. Either way the write's queries refetch afterwards.

A write that creates something waits for the server, because the server assigns
the key, number or id that a link needs. A comment is the exception. It shows at
once as "Enviando…" without reactions, and the box clears; a failure removes it
and puts the text back.

Feedback follows from that:

- A success shows in the data and gets no message. Quick create keeps a "KEY
  creada · Abrir" line under the box until the next task.
- A create form (`inline: true`) shows its failure next to its button with
  `FormError` and keeps what was typed.
- A one-click change undoes itself, and a toast says why. The toast stays until
  it is closed, so it can be read.

## Layout

`Page` gives every screen one column, so the title stays put between screens.
`width="form"` keeps the column and narrows the content to a form's measure.
`width="wide"` is the calendar's. The scrolling area reserves its scrollbar
gutter, so a short page and a long one line up.

## Theme

Light and dark follow `data-theme` on `<html>`. The Apariencia section of the
profile page offers "Como el sistema", "Claro" and "Oscuro"; the pick is stored
in `localStorage` under `theme`, and no entry means the system setting. A script
in `index.html` sets the attribute before the first paint, so a dark page never
flashes light; `src/web/lib/theme.ts` keeps it in step afterwards, also when the
system setting changes. Tailwind's `dark:` variant follows the same attribute.

## Calendar events

"Nuevo evento" on `/calendar` opens a dialog that invites people and can add a
Google Meet link. Its grid shows the creator and each guest from 8:00 to 20:00
in half hours, busy cells shaded, from `GET /api/freebusy`. "Todos libres"
offers the first starts at which everyone is free for the chosen length
(`src/web/lib/slots.ts`). Clicking a cell or a suggestion sets the time. A
person without Google is marked, since only their Teams events count. A timed
event shows on its local day.
