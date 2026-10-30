import type { Task, TaskStatus } from "@shared/types";
import type { TaskQuery } from "@/api";
import { addDays } from "./dates";

export const isOpen = (status: TaskStatus) =>
  status !== "done" && status !== "canceled";

export type DueGroup =
  | "overdue"
  | "today"
  | "week"
  | "later"
  | "none"
  | "closed";

export const DUE_GROUPS: { id: DueGroup; label: string }[] = [
  { id: "overdue", label: "Atrasadas" },
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "later", label: "Más adelante" },
  { id: "none", label: "Sin fecha" },
  { id: "closed", label: "Cerradas" },
];

export function dueGroup(
  task: Pick<Task, "due_date" | "status">,
  today: string,
): DueGroup {
  const due = task.due_date;
  if (!isOpen(task.status)) return "closed";
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return due <= addDays(today, 7) ? "week" : "later";
}

export function groupByDue(tasks: Task[], today: string) {
  const groups = new Map<DueGroup, Task[]>();
  for (const t of tasks) {
    const id = dueGroup(t, today);
    groups.set(id, [...(groups.get(id) ?? []), t]);
  }
  return DUE_GROUPS.flatMap(({ id, label }) => {
    const items = groups.get(id);
    return items ? [{ id, label, items }] : [];
  });
}

// The due-date windows a list can be narrowed to. Both cover open tasks only.
export type DueWindow = "overdue" | "week";

export type TaskFilters = {
  owner?: string;
  status?: string;
  label?: string;
  project?: string;
  q?: string;
  due?: DueWindow;
};

// The server's query for a list: `base` says which tasks the list is about and
// `filters` narrow it. owner "none" matches unowned tasks. `week` runs from
// today to seven days ahead, so it includes what `dueGroup` calls today. Only
// filter names reach the query: view state in the same search object (the open
// panel, the board view) must not change the list's cache key.
const FILTER_NAMES = ["owner", "status", "label", "project", "q"] as const;

export function taskQuery(
  base: TaskQuery,
  filters: TaskFilters,
  today: string,
): TaskQuery {
  const { due } = filters;
  const query: TaskQuery = { ...base };
  for (const name of FILTER_NAMES) {
    const value = filters[name]?.trim();
    if (value) query[name] = value;
  }
  if (due === "overdue") {
    query.open = "1";
    query.due_before = addDays(today, -1);
  }
  if (due === "week") {
    query.open = "1";
    query.due_after = today;
    query.due_before = addDays(today, 7);
  }
  return query;
}

export type Drop = { key: string; patch: { due_date: string } } | null;

// What a drop on a calendar day changes. Dropping on the current day is no
// change.
export function dropOnDay(task: Task, day: string): Drop {
  return task.due_date === day
    ? null
    : { key: task.key, patch: { due_date: day } };
}
