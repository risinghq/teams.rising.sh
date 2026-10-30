import { STATUSES, type Member, type Project, type TaskStatus } from "../api";

export { PRIORITY_LABEL, STATUS_LABEL, STATUSES } from "../api";

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
