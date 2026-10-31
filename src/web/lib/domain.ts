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
