import { progress } from "../shared/progress";
import type { Project, Task, TaskStatus } from "./api";
import { t } from "./i18n";

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
  { id: "overdue", label: t("Overdue") },
  { id: "today", label: t("Today") },
  { id: "week", label: t("This week") },
  { id: "later", label: t("Later") },
  { id: "none", label: t("No date") },
  { id: "closed", label: t("Closed") },
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

// "" matches everything. owner "none" matches unowned tasks, project "none"
// tasks outside any project.
export function filterTasks(tasks: Task[], f: Filters): Task[] {
  return tasks.filter(
    (t) =>
      (!f.owner || (f.owner === "none" ? !t.owner : t.owner?.id === f.owner)) &&
      (!f.status || t.status === f.status) &&
      (!f.label || t.labels.some((l) => l.id === f.label)) &&
      (!f.project ||
        (f.project === "none" ? !t.project_id : t.project_id === f.project)),
  );
}

export type ProjectSummary = {
  project: Project;
  open: number;
  progress: number;
  nextDue: string | null;
};

// A project with a target date ends. One without is an area that stays open,
// such as funding calls. Progress counts the project's tasks the way a task
// counts its subtasks.
export function summarizeProjects(projects: Project[], tasks: Task[]) {
  const summaries = projects
    .filter((p) => p.status === "active")
    .map((project): ProjectSummary => {
      const own = tasks.filter((t) => t.project_id === project.id);
      const open = own.filter((t) => isOpen(t.status));
      const dues = open.flatMap((t) => (t.due_date ? [t.due_date] : [])).sort();
      return {
        project,
        open: open.length,
        progress: progress({ status: "todo" }, own),
        nextDue: dues[0] ?? null,
      };
    });
  return {
    projects: summaries.filter((s) => s.project.target_date),
    areas: summaries.filter((s) => !s.project.target_date),
    loose: tasks.filter((t) => !t.project_id && isOpen(t.status)).length,
  };
}

export type Segment = { text: string; url?: string };

// Splits text so http(s) URLs can render as links. Trailing punctuation stays
// outside the URL.
export function linkify(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/g)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({ text: m[0], url: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
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
  if (s < 60) return t("just now");
  if (s < 3600) return t("{n}m ago", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n}h ago", { n: Math.floor(s / 3600) });
  return t("{n}d ago", { n: Math.floor(s / 86400) });
}
