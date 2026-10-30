# API

JSON over HTTPS under `/api`. Dates are `YYYY-MM-DD`. Timestamps are ISO 8601
UTC. Ids are opaque strings. Errors return `{"error": "message"}` with a 4xx or
5xx status.

A request body that is not a JSON object, or has a field of the wrong type,
shape or size, gets 400. The message is in Spanish and starts with the field
name, for example `title es obligatorio`. Only the first problem is reported.

Every route except `/api/health` and `/api/auth/*` needs a session cookie. A
request without one gets 401.

## Auth

| Route                           | Behavior                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/google`          | Redirects to Google sign-in.                                                                                |
| `GET /api/auth/google/callback` | Creates the user and session, sets the `session` cookie (HttpOnly, Secure, SameSite=Lax), redirects to `/`. |
| `POST /api/auth/logout`         | Deletes the session.                                                                                        |
| `GET /api/me`                   | The user, their teams with roles, and `is_admin`.                                                           |
| `POST /api/auth/dev`            | Signs in by email without Google. Exists only when `DEV_LOGIN=1`, for tests and local runs. Otherwise 404.  |

Sign-in is limited to the Google Workspace domain or email list in the
`ALLOWED_EMAILS` and `ALLOWED_DOMAINS` settings. The first user to sign in
becomes an admin.

## Resources

| Route                                                  | Behavior                                                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/users`                                       | All users, for pickers.                                                                                                                                   |
| `GET/POST /api/teams`                                  | List teams with member counts. Admin creates. Create and patch return the team with its `members` count.                                                  |
| `GET/PATCH /api/teams/:key`                            | Team with members and roles. Leader or admin patches.                                                                                                     |
| `PUT/DELETE /api/teams/:key/members/:userId`           | Leader or admin sets role or removes.                                                                                                                     |
| `GET/POST /api/teams/:key/projects`                    | List and create projects. The list adds `open`, `progress` and `next_due` to each project (see Project counts).                                           |
| `PATCH /api/projects/:id`                              | Update a project.                                                                                                                                         |
| `GET /api/tasks`                                       | Tasks the caller can see, each with `progress`, `key`, `owner`, `labels`. Filters and paging are under Task list.                                         |
| `POST /api/tasks`                                      | Create. Body: `team`, `title`, and optional fields. Assigns the next number.                                                                              |
| `GET /api/tasks/:key`                                  | Task with subtasks, collaborators, labels, links and updates.                                                                                             |
| `PATCH /api/tasks/:key`                                | Change fields. Writes the matching updates.                                                                                                               |
| `POST /api/tasks/:key/updates`                         | Add a comment. Body: `{"body": "..."}`.                                                                                                                   |
| `PUT/DELETE /api/tasks/:key/collaborators/:userId`     | Any user can add themselves to an open task. Anyone who can edit the task adds others.                                                                    |
| `GET/POST /api/labels`                                 | List and create labels.                                                                                                                                   |
| `GET /api/inbox`                                       | Updates on tasks the caller owns, collaborates on, or is mentioned in, newest first. Returns `items` and `unread`, the number of tasks with unread items. |
| `POST /api/inbox/read`                                 | Marks the whole inbox read up to now.                                                                                                                     |
| `POST /api/inbox/read/:key`                            | Marks one task's inbox items read up to now. The web app calls it when a task opens.                                                                      |
| `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` | Calendar events. Query `from`, `to`.                                                                                                                      |
| `GET /api/calendar`                                    | Tasks with dates and events in `from`..`to`, merged.                                                                                                      |
| `GET /api/overview`                                    | Open, blocked and overdue counts by team and by owner.                                                                                                    |

## Project counts

For each project in `GET /api/teams/:key/projects`, counted over the tasks the
caller can see. A private task the caller cannot see is not counted.

| Field      | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `open`     | Tasks whose status is not `done` or `canceled`.                                        |
| `progress` | Done tasks divided by tasks that are not canceled, from 0 to 1. 0 when there are none. |
| `next_due` | The earliest due date among open tasks, or `null`.                                     |

## Task list

`GET /api/tasks` takes these query parameters. All are optional, and a task must
match every one given.

| Parameter                 | Meaning                                          |
| ------------------------- | ------------------------------------------------ |
| `team`                    | Team key.                                        |
| `owner`                   | A user id, `me`, or `none` for unassigned tasks. |
| `status`                  | Comma-separated statuses.                        |
| `open=1`                  | Excludes `done` and `canceled`.                  |
| `top=1`                   | Excludes subtasks.                               |
| `project`, `label`        | A project id. A label id or name.                |
| `due_before`, `due_after` | Inclusive date bounds.                           |
| `collaborator=me`         | Tasks the caller collaborates on.                |
| `q`                       | Matches the title or the task key.               |
| `limit`                   | Page size, 1 to 500. Default 100.                |
| `cursor`                  | The `X-Next-Cursor` value of the previous page.  |

Tasks are ordered by due date (tasks without one last), then last update
descending, then id. The response is always a JSON array. When more tasks
follow, the response has an `X-Next-Cursor` header; send its value as `cursor`
with the same filters to get the next page. The header is absent on the last
page. A `limit` outside 1 to 500 or an unreadable `cursor` gets 400.

## Hooks

`POST /hooks/github` is not under `/api` and uses its own signature check.

### GitHub

`POST /hooks/github` verifies `X-Hub-Signature-256` against
`GITHUB_WEBHOOK_SECRET`. It returns 503 when the secret is unset and 401 on a
bad signature. Send the events `pull_request`, `issues` and `push`.

A task key such as `ENG-12` in a pull request title, branch name or body, an
issue title or body, or a commit message links that object to the task. An
object that names several keys links to the first task that exists. A pull
request or issue that changes state writes a `link` update to the task's
activity. A push links its branch when the branch name holds a key, and each
commit whose message holds one.
