import type { Member, Project, TaskStatus } from "@shared/types";

// The Spanish names the interface uses for what the server stores. Every label
// lives here.

// The order of the status menu, the board columns and the filter: the path a
// task usually takes first, then the states off that path.
export const STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "backlog",
  "canceled",
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Pendiente",
  todo: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueada",
  done: "Hecha",
  canceled: "Cancelada",
};

// Indexed by the task's `priority`, 0 to 3.

// The status a form value or URL parameter names, or undefined when it names none.
export const parseStatus = (value: unknown): TaskStatus | undefined =>
  STATUSES.find((s) => s === value);

// Labels most teams end up with, offered when a team adds one so it has
// something to start from. Each keeps one color everywhere.
export const SUGGESTED_LABELS = [
  { name: "idea", color: "#df8e1d" },
  { name: "investigación", color: "#1e66f5" },
  { name: "paper", color: "#8839ef" },
  { name: "datos", color: "#fe640b" },
  { name: "código", color: "#40a02b" },
  { name: "contenido", color: "#ea76cb" },
  { name: "reunión", color: "#179299" },
  { name: "urgente", color: "#d20f39" },
] as const;

// Label names compare without case or accents, so "Código" is "codigo".
export const labelKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

export const ROLE_LABEL: Record<Member["role"], string> = {
  leader: "Líder",
  member: "Miembro",
};

export const PROJECT_STATUS_LABEL: Record<Project["status"], string> = {
  active: "Activo",
  done: "Terminado",
  archived: "Archivado",
};

export const LINK_STATE_LABEL: Record<string, string> = {
  open: "abierto",
  closed: "cerrado",
  merged: "fusionado",
};

export type { TaskStatus };
