import type {
  InvalidateQueryFilters,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import type { TaskDetail } from "@shared/types";
import { queryKeys as k } from "./query-keys";

const byKey = (...keys: QueryKey[]): InvalidateQueryFilters[] =>
  keys.map((queryKey) => ({ queryKey }));

// A task detail lists its subtasks and their progress, so it goes stale when
// one of them changes. The detail is cached by key, but a subtask knows its
// parent only by id.
const detailOfTaskId = (id: string): InvalidateQueryFilters => ({
  queryKey: k.tasks.details,
  predicate: (query) => (query.state.data as TaskDetail | undefined)?.id === id,
});

// The queries each write makes stale. A write names only what it can change:
// a comment touches its task, not the calendar. Only mounted queries refetch
// right away; the rest refetch when next used.
//
// The filters take the arguments of the write, so a write scoped to a task
// or a team invalidates just that one.
export const invalidations = {
  // Project cards show the server's open, progress and next due counts, which
  // every task write can move.
  createTask: (_: unknown) =>
    byKey(k.tasks.lists, k.projects.all, k.calendar.all, k.overview),
  // The inbox follows the owner and due date notices.
  patchTask: (a: { key: string; parentId: string | null }) => [
    ...byKey(
      k.tasks.detail(a.key),
      k.tasks.lists,
      k.projects.all,
      k.calendar.all,
      k.inbox,
      k.overview,
    ),
    ...(a.parentId ? [detailOfTaskId(a.parentId)] : []),
  ],
  comment: (a: { key: string }) => byKey(k.tasks.detail(a.key)),
  react: (a: { key: string }) => byKey(k.tasks.detail(a.key)),
  addCollaborator: (a: { key: string }) =>
    byKey(k.tasks.detail(a.key), k.tasks.lists),
  removeCollaborator: (a: { key: string }) =>
    byKey(k.tasks.detail(a.key), k.tasks.lists),
  createProject: (a: { team: string }) => byKey(k.projects.ofTeam(a.team)),
  patchProject: (a: { team: string }) =>
    byKey(k.projects.ofTeam(a.team), k.tasks.lists),
  createTeam: (_: unknown) => byKey(k.teams.list, k.me, k.overview),
  patchTeam: (a: { team: string }) =>
    byKey(k.teams.list, k.teams.detail(a.team), k.me),
  setMember: (a: { team: string }) =>
    byKey(k.teams.detail(a.team), k.teams.list, k.me),
  removeMember: (a: { team: string }) =>
    byKey(k.teams.detail(a.team), k.teams.list, k.me),
  createLabel: (_: unknown) => byKey(k.labels),
  // A person's name and picture show on almost every screen.
  patchMe: (_: unknown) => [{}],
} satisfies Record<string, (args: never) => readonly InvalidateQueryFilters[]>;

export type WriteName = keyof typeof invalidations;
export type WriteScope<N extends WriteName> = Parameters<
  (typeof invalidations)[N]
>[0];

function staleQueries<N extends WriteName>(name: N, scope: WriteScope<N>) {
  const filtersFor = invalidations[name] as (
    scope: WriteScope<N>,
  ) => readonly InvalidateQueryFilters[];
  return filtersFor(scope);
}

export function invalidateAfter<N extends WriteName>(
  client: QueryClient,
  name: N,
  scope: WriteScope<N>,
) {
  return Promise.all(
    staleQueries(name, scope).map((filters) =>
      client.invalidateQueries(filters),
    ),
  );
}
