import type { QueryClient, QueryFilters } from "@tanstack/react-query";
import type {
  CalEvent,
  Label,
  Me,
  Member,
  Person,
  Project,
  Reaction,
  Task,
  TaskDetail,
  Team,
  TeamDetail,
  Update,
} from "@shared/types";
import type { TaskPage } from "@/api";
import { queryKeys as k } from "./query-keys";

// A write's change to the cached data of the queries a filter matches, made
// before the server answers so the screen follows a click at once. The
// updater sees only loaded data.
export type Patch = { filters: QueryFilters; update: (data: never) => unknown };

// Reads a cached query, for a patch that needs a person or a label.
export type Read = <T>(key: readonly unknown[]) => T | undefined;

const patch = <T>(filters: QueryFilters, update: (data: T) => T): Patch => ({
  filters,
  update,
});

const PENDING = "pending-";

// A comment written here and not yet stored. It has no server id, so nothing
// can act on it until the task is fetched again.
export const isPending = (u: Update) => u.id.startsWith(PENDING);

const personOf = (read: Read, id: string | null): Person | null => {
  if (!id) return null;
  const u = read<Person[]>(k.users)?.find((x) => x.id === id);
  return u ? { id: u.id, name: u.name, avatar_url: u.avatar_url } : null;
};

const pick = (body: Record<string, unknown>, fields: readonly string[]) =>
  Object.fromEntries(Object.entries(body).filter(([f]) => fields.includes(f)));

// The fields of a task patch that are fields of the task. `owner_id` and
// `labels` are resolved from the cached people and labels.
const TASK_FIELDS = [
  "title",
  "description",
  "status",
  "visibility",
  "start_date",
  "due_date",
  "project_id",
];

function patchedTask<T extends Task>(
  task: T,
  body: Record<string, unknown>,
  read: Read,
): T {
  const next: T = { ...task, ...pick(body, TASK_FIELDS) };
  if ("owner_id" in body)
    next.owner = personOf(read, body.owner_id as string | null);
  if (Array.isArray(body.labels)) {
    const known = read<Label[]>(k.labels) ?? [];
    next.labels = known
      .filter((l) => (body.labels as string[]).includes(l.id))
      .map(({ id, name, color }) => ({ id, name, color }));
  }
  return next;
}

// Every cached copy of a task: its detail, a parent's subtask row, list and
// peek pages, and the calendar.
export function taskPatch(
  { key, patch: body }: { key: string; patch: Record<string, unknown> },
  read: Read,
): Patch[] {
  const one = <T extends Task>(t: T) =>
    t.key === key ? patchedTask(t, body, read) : t;
  const page = (p: TaskPage) => ({ ...p, items: p.items.map(one) });
  return [
    patch<TaskDetail>({ queryKey: k.tasks.details }, (d) => ({
      ...one(d),
      subtasks: d.subtasks.map(one),
    })),
    patch<TaskPage | { pages: TaskPage[]; pageParams: unknown[] }>(
      { queryKey: k.tasks.lists },
      (data) =>
        "pages" in data ? { ...data, pages: data.pages.map(page) } : page(data),
    ),
    patch<{ tasks: Task[] }>({ queryKey: k.calendar.all }, (c) => ({
      ...c,
      tasks: c.tasks.map(one),
    })),
  ];
}

export const eventRemoved = (a: { id: string }) => [
  patch<{ events: CalEvent[] }>({ queryKey: k.calendar.all }, (c) => ({
    ...c,
    events: c.events.filter((e) => e.id !== a.id),
  })),
];

const onDetail = (key: string, change: (d: TaskDetail) => TaskDetail) => [
  patch<TaskDetail>({ queryKey: k.tasks.detail(key) }, change),
];

function toggled(
  reactions: Reaction[],
  emoji: string,
  on: boolean,
  name: string,
): Reaction[] {
  const found = reactions.find((r) => r.emoji === emoji);
  if (on) {
    if (found?.mine) return reactions;
    return found
      ? reactions.map((r) =>
          r === found ? { ...r, names: [...r.names, name], mine: true } : r,
        )
      : [...reactions, { emoji, names: [name], mine: true }];
  }
  if (!found?.mine) return reactions;
  const at = found.names.lastIndexOf(name);
  const names = found.names.filter((_, i) => i !== at);
  return names.length === 0
    ? reactions.filter((r) => r !== found)
    : reactions.map((r) => (r === found ? { ...r, names, mine: false } : r));
}

export const applyReaction = (
  a: { key: string; updateId: string; emoji: string; on: boolean },
  read: Read,
) => {
  const name = read<Me>(k.me)?.name ?? "";
  return onDetail(a.key, (d) => ({
    ...d,
    updates: d.updates.map((u) =>
      u.id === a.updateId
        ? { ...u, reactions: toggled(u.reactions, a.emoji, a.on, name) }
        : u,
    ),
  }));
};

export const pendingComment = (
  a: { key: string; body: string },
  read: Read,
) => {
  const me = read<Me>(k.me);
  const pending: Update = {
    id: `${PENDING}${crypto.randomUUID()}`,
    kind: "comment",
    body: a.body,
    meta: {},
    created_at: new Date().toISOString(),
    author_id: me?.id ?? null,
    author_name: me?.name ?? null,
    author_avatar: me?.avatar_url ?? null,
    reactions: [],
  };
  return onDetail(a.key, (d) => ({ ...d, updates: [...d.updates, pending] }));
};

export const commentEdited = (a: {
  key: string;
  updateId: string;
  body: string;
}) =>
  onDetail(a.key, (d) => ({
    ...d,
    updates: d.updates.map((u) =>
      u.id === a.updateId ? { ...u, body: a.body } : u,
    ),
  }));

export const commentRemoved = (a: { key: string; updateId: string }) =>
  onDetail(a.key, (d) => ({
    ...d,
    updates: d.updates.filter((u) => u.id !== a.updateId),
  }));

// Drops the task from every list and from a parent's subtasks.
export function taskRemoved(a: { key: string }): Patch[] {
  const keep = (t: Task) => t.key !== a.key;
  const page = (p: TaskPage) => ({ ...p, items: p.items.filter(keep) });
  return [
    patch<TaskDetail>({ queryKey: k.tasks.details }, (d) => ({
      ...d,
      subtasks: d.subtasks.filter(keep),
    })),
    patch<TaskPage | { pages: TaskPage[]; pageParams: unknown[] }>(
      { queryKey: k.tasks.lists },
      (data) =>
        "pages" in data ? { ...data, pages: data.pages.map(page) } : page(data),
    ),
    patch<{ tasks: Task[] }>({ queryKey: k.calendar.all }, (c) => ({
      ...c,
      tasks: c.tasks.filter(keep),
    })),
  ];
}

// Drops the label from the label list and from every cached task.
export function labelRemoved(a: { id: string }): Patch[] {
  const strip = <T extends Task>(t: T): T =>
    t.labels.some((l) => l.id === a.id)
      ? { ...t, labels: t.labels.filter((l) => l.id !== a.id) }
      : t;
  const page = (p: TaskPage) => ({ ...p, items: p.items.map(strip) });
  return [
    patch<Label[]>({ queryKey: k.labels }, (list) =>
      list.filter((l) => l.id !== a.id),
    ),
    patch<TaskDetail>({ queryKey: k.tasks.details }, (d) => ({
      ...strip(d),
      subtasks: d.subtasks.map(strip),
    })),
    patch<TaskPage | { pages: TaskPage[]; pageParams: unknown[] }>(
      { queryKey: k.tasks.lists },
      (data) =>
        "pages" in data ? { ...data, pages: data.pages.map(page) } : page(data),
    ),
  ];
}

export const collaboratorAdded = (
  a: { key: string; userId: string },
  read: Read,
) => {
  const person = personOf(read, a.userId);
  if (!person) return [];
  return onDetail(a.key, (d) => ({
    ...d,
    collaborators: [...d.collaborators, person],
  }));
};

export const collaboratorRemoved = (a: { key: string; userId: string }) =>
  onDetail(a.key, (d) => ({
    ...d,
    collaborators: d.collaborators.filter((c) => c.id !== a.userId),
  }));

export const projectPatch = (a: {
  team: string;
  id: string;
  body: Record<string, unknown>;
}) => [
  patch<Project[]>({ queryKey: k.projects.ofTeam(a.team) }, (list) =>
    list.map((p) => (p.id === a.id ? { ...p, ...a.body } : p)),
  ),
];

export function teamPatch(a: { team: string; body: Record<string, unknown> }) {
  const fields = pick(a.body, ["name", "image_url"]);
  const one = <T extends { key: string }>(t: T): T =>
    t.key === a.team ? { ...t, ...fields } : t;
  return [
    patch<Team[]>({ queryKey: k.teams.list }, (list) => list.map(one)),
    patch<TeamDetail>({ queryKey: k.teams.detail(a.team) }, one),
    patch<Me>({ queryKey: k.me }, (me) => ({
      ...me,
      teams: me.teams.map(one),
    })),
  ];
}

const onMembers = (team: string, change: (m: Member[]) => Member[]) => [
  patch<TeamDetail>({ queryKey: k.teams.detail(team) }, (t) => ({
    ...t,
    members: change(t.members),
  })),
];

export const memberRole = (a: {
  team: string;
  userId: string;
  role: Member["role"];
}) =>
  onMembers(a.team, (members) =>
    members.map((m) => (m.id === a.userId ? { ...m, role: a.role } : m)),
  );

export const memberRemoved = (a: { team: string; userId: string }) =>
  onMembers(a.team, (members) => members.filter((m) => m.id !== a.userId));

// The server lowercases the handle and tidies the number; the refetch after
// the write shows the stored form.
export function mePatch(body: Record<string, unknown>, read: Read) {
  const id = read<Me>(k.me)?.id;
  const person = pick(body, ["name", "avatar_url"]);
  return [
    patch<Me>({ queryKey: k.me }, (me) => ({ ...me, ...body })),
    patch<Person[]>({ queryKey: k.users }, (users) =>
      users.map((u) => (u.id === id ? { ...u, ...person } : u)),
    ),
  ];
}

// Applies patches to the cache and returns what undoes them. A fetch already
// under way is cancelled first, so its older answer cannot overwrite a patch.
export async function applyPatches(client: QueryClient, patches: Patch[]) {
  await Promise.all(patches.map((p) => client.cancelQueries(p.filters)));
  const before = new Map<string, [readonly unknown[], unknown]>();
  for (const { filters, update } of patches) {
    for (const query of client.getQueryCache().findAll(filters))
      if (!before.has(query.queryHash))
        before.set(query.queryHash, [query.queryKey, query.state.data]);
    client.setQueriesData(filters, (data) =>
      data === undefined ? data : update(data as never),
    );
  }
  return () => {
    for (const [key, data] of before.values()) client.setQueryData(key, data);
  };
}
