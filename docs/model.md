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
- A user's profile is `name`, `username`, `avatar_url` and `whatsapp_number`.
  `username` is unique and is the mention handle; without one, the handle is the
  part of the email before the `@`. `whatsapp_verified_at` is set when the
  number is confirmed and cleared when it changes.
- `teams.image_url` is the team's picture. A GIF stays animated. Without one the
  team shows its colored initial.
- A leader edits anything in their team. A member edits tasks they own or
  collaborate on, and comments on any task they can see.

## Projects

- A project with a target date ends and shows progress: the share of its done
  tasks, ignoring canceled ones.
- A project without a target date is an area that stays open, such as funding
  calls or graduate programs. It shows its open tasks and their nearest due
  date.
- Any team member can create a project. A leader edits it and closes it as
  `done` or `archived`. Only `active` projects show on the team page.

## Tasks

- A task has a per-team `number`. Its key is the team key plus the number, for
  example `OPS-12`. Git branches and PR titles refer to it by key.
- Status: `backlog`, `todo`, `in_progress`, `blocked`, `done`, `canceled`.
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
`progress`, `link` or `collaborator`. A change to status, owner or due date, and
adding or removing a collaborator, writes an update in the same batch as the
change. Edits to the title, description, visibility, project and labels write
none. `meta` holds JSON, for example `{"from":"todo","to":"done"}` for a status
update or `{"added":"<user id>"}` for a collaborator. A comment's `meta` lists
the ids of the users it mentions.

The inbox is the updates by other people on tasks the caller owns or
collaborates on, comments that mention the caller, and the owner or collaborator
change that took the caller off a task. An update is unread when it is newer
than both `users.inbox_read_at` (the last "read all") and the caller's
`inbox_reads.read_at` for that task (the last time they opened it).

## Integrations

- GitHub: a webhook at `/hooks/github` links pull requests, issues, branches and
  commits to a task by key, and keeps `task_links.state` current.
- Google: sign-in uses Google OIDC. Calendar sync is one way: an event created,
  changed or deleted in Teams is mirrored to its creator's primary calendar and
  keeps that calendar's id in `events.google_event_id`. Nothing is read back, so
  private Google events never reach the org. A Google failure leaves the Teams
  event saved.
