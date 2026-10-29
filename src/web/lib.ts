import type { Task, TaskStatus } from "./api";

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const addDays = (s: string, n: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

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
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "later", label: "Later" },
  { id: "none", label: "No date" },
  { id: "closed", label: "Closed" },
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

export type Filters = {
  owner: string;
  status: string;
  label: string;
  project: string;
};

export const NO_FILTERS: Filters = {
  owner: "",
  status: "",
  label: "",
  project: "",
};

// "" matches everything. owner "none" matches unowned tasks.
export function filterTasks(tasks: Task[], f: Filters): Task[] {
  return tasks.filter(
    (t) =>
      (!f.owner || (f.owner === "none" ? !t.owner : t.owner?.id === f.owner)) &&
      (!f.status || t.status === f.status) &&
      (!f.label || t.labels.some((l) => l.id === f.label)) &&
      (!f.project || t.project_id === f.project),
  );
}

export type Drop = { key: string; patch: { due_date: string } } | null;

// What a drop on a calendar day changes. Dropping on the current day is no
// change.
export function dropOnDay(task: Task, day: string): Drop {
  return task.due_date === day
    ? null
    : { key: task.key, patch: { due_date: day } };
}

export type PaletteItem = {
  id: string;
  kind: "task" | "team" | "screen";
  label: string;
  hint: string;
  to: string;
};

// A key query like "ops-12" ranks by prefix. Words match anywhere in the label,
// in any order. Tasks come after teams and screens that match equally.
export function searchPalette(items: PaletteItem[], query: string, limit = 12) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items.slice(0, limit);
  const scored = items.flatMap((item) => {
    const hay = `${item.label} ${item.hint}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return [];
    const starts = words.some(
      (w) =>
        item.hint.toLowerCase().startsWith(w) ||
        item.label.toLowerCase().startsWith(w),
    );
    const rank = (starts ? 0 : 2) + (item.kind === "task" ? 1 : 0);
    return [{ item, rank }];
  });
  return scored
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((s) => s.item);
}

export function monthGrid(anchor: string): string[] {
  const first = parseDay(`${anchor.slice(0, 7)}-01`);
  const lead = (first.getDay() + 6) % 7;
  const start = addDays(iso(first), -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekGrid(anchor: string): string[] {
  const lead = (parseDay(anchor).getDay() + 6) % 7;
  const start = addDays(anchor, -lead);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function relativeTime(then: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(then)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
