# API

JSON over HTTPS under `/api`. Dates are `YYYY-MM-DD`. Timestamps are ISO 8601
UTC. Ids are opaque strings. Errors return `{"error": "message"}` with a 4xx or
5xx status.

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

| Route                                                  | Behavior                                                                                                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/users`                                       | All users, for pickers.                                                                                                                                                                                   |
| `GET/POST /api/teams`                                  | List teams with member counts. Admin creates.                                                                                                                                                             |
| `GET/PATCH /api/teams/:key`                            | Team with members and roles. Leader or admin patches.                                                                                                                                                     |
| `PUT/DELETE /api/teams/:key/members/:userId`           | Leader or admin sets role or removes.                                                                                                                                                                     |
| `GET/POST /api/teams/:key/projects`                    | List and create projects.                                                                                                                                                                                 |
| `PATCH /api/projects/:id`                              | Update a project.                                                                                                                                                                                         |
| `GET /api/tasks`                                       | Query: `team`, `owner` (`me` allowed), `status`, `project`, `label`, `due_before`, `due_after`, `q`, `collaborator=me`. Returns tasks the caller can see, each with `progress`, `key`, `owner`, `labels`. |
| `POST /api/tasks`                                      | Create. Body: `team`, `title`, and optional fields. Assigns the next number.                                                                                                                              |
| `GET /api/tasks/:key`                                  | Task with subtasks, collaborators, labels, links and updates.                                                                                                                                             |
| `PATCH /api/tasks/:key`                                | Change fields. Writes the matching updates.                                                                                                                                                               |
| `POST /api/tasks/:key/updates`                         | Add a comment. Body: `{"body": "..."}`.                                                                                                                                                                   |
| `PUT/DELETE /api/tasks/:key/collaborators/:userId`     | Any user can add themselves to an open task. A leader or the owner adds others.                                                                                                                           |
| `GET/POST /api/labels`                                 | List and create labels.                                                                                                                                                                                   |
| `GET /api/inbox`                                       | Updates on tasks the caller owns, collaborates on, or is mentioned in, newest first. Returns `unread` and `items`.                                                                                        |
| `POST /api/inbox/read`                                 | Marks the inbox read up to now.                                                                                                                                                                           |
| `GET/POST /api/events`, `PATCH/DELETE /api/events/:id` | Calendar events. Query `from`, `to`.                                                                                                                                                                      |
| `GET /api/calendar`                                    | Tasks with dates and events in `from`..`to`, merged.                                                                                                                                                      |
| `GET /api/overview`                                    | Open, blocked and overdue counts by team and by owner.                                                                                                                                                    |

## Hooks

`POST /hooks/github` and `POST /hooks/whatsapp` are not under `/api` and use
their own signature checks.
