# Model

```
Org (one per deployment)
 └─ Team               many leaders
     └─ Project        optional grouping with a target date
         └─ Task       one owner, any number of collaborators
             └─ Update a dated entry in the task timeline
```

## Teams and roles

- A user belongs to any number of teams. `team_members.role` is `leader` or
  `member`. A team has one or more leaders.
- `users.is_admin` marks an org admin. An admin can create teams and set
  leaders.
- A leader edits anything in their team. A member edits tasks they own or
  collaborate on, and comments on any task they can see.

## Tasks

- A task has a per-team `number`. Its key is the team key plus the number, for
  example `OPS-12`. Git branches, PR titles and WhatsApp messages refer to it by
  key.
- Status: `backlog`, `todo`, `in_progress`, `blocked`, `done`, `canceled`.
- Priority: 0 none, 1 low, 2 medium, 3 urgent.
- Tasks are open by default. Everyone in the org can see and comment on an open
  task, and anyone can become a collaborator. This is how people help across
  teams.
- A `private` task is visible only to its owner, its creator, its collaborators,
  the leaders of its team and admins.
- Progress comes from `src/shared/progress.ts`: the share of done subtasks, or
  the status when there are none.
- Labels carry the kind of work (code, logistics, and any other). There are no
  logistics-only fields.

## Updates

`task_updates` is the timeline. `kind` is `comment`, `status`, `owner`, `due`,
`progress`, `link` or `whatsapp`. A change to status, owner or due date writes
an update in the same batch as the change. Edits to the title, description,
priority, visibility, project and labels write none. `meta` holds JSON, for
example `{"from":"todo","to":"done"}` for a status update. A comment's `meta`
lists the ids of the users it mentions.

The inbox is the updates by other people on tasks the caller owns or
collaborates on, plus comments that mention the caller. An update is unread when
it is newer than `users.inbox_read_at`.

## Integrations

- GitHub: a webhook at `/hooks/github` links pull requests, issues, branches and
  commits to a task by key, and keeps `task_links.state` current.
- Google: sign-in uses Google OIDC. Calendar sync reads and writes `events` and
  task due dates through `google_event_id`.
- WhatsApp: a webhook at `/hooks/whatsapp` turns a message from a known
  `users.whatsapp_number` into an update on a task. Notifications go out through
  the Cloud API.
