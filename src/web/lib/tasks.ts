import { progress } from "../../shared/progress";
import type { Project, Task, TaskStatus } from "../api";
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

export type TaskFilters = {
  owner?: string;
  status?: string;
  label?: string;
  project?: string;
  q?: string;
};

// A missing filter matches everything. owner "none" matches unowned tasks,
// project "none" tasks outside any project. `q` matches the title or the key
// in any letter case.
export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.q?.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!f.owner || (f.owner === "none" ? !t.owner : t.owner?.id === f.owner)) &&
      (!f.status || t.status === f.status) &&
      (!f.label || t.labels.some((l) => l.id === f.label)) &&
      (!f.project ||
        (f.project === "none" ? !t.project_id : t.project_id === f.project)) &&
      (!q ||
        t.title.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q)),
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

export type Drop = { key: string; patch: { due_date: string } } | null;

// What a drop on a calendar day changes. Dropping on the current day is no
// change.
export function dropOnDay(task: Task, day: string): Drop {
  return task.due_date === day
    ? null
    : { key: task.key, patch: { due_date: day } };
}
