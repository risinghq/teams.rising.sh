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
| `due`     | `/`, `/t/$team` | `overdue` or `week`, both over open tasks |
| `label`   | `/`, `/t/$team` | One label id                              |
| `q`       | `/`, `/t/$team` | Text in the title or key                  |
| `view`    | `/`, `/t/$team` | `board`; the list is the default          |
| `task`    | `/`, `/t/$team` | The task open in the side panel           |
| `owner`   | `/t/$team`      | A person id or `none`                     |
| `project` | `/t/$team`      | A project id                              |
| `mode`    | `/calendar`     | `week`; the month is the default          |
| `date`    | `/calendar`     | A day other than today                    |

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
