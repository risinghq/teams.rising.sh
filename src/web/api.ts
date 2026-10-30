import {
  TASK_STATUSES,
  type CalEvent,
  type InboxItem,
  type Label,
  type Me,
  type Member,
  type OverviewRow,
  type Project,
  type Task,
  type TaskDetail,
  type TaskStatus,
  type Team,
  type TeamDetail,
  type User,
} from "../shared/types";

export type {
  CalEvent,
  InboxItem,
  Label,
  Me,
  Member,
  OverviewRow,
  Person,
  Project,
  Task,
  TaskDetail,
  TaskLink,
  TaskStatus,
  Team,
  TeamDetail,
  Update,
  User,
} from "../shared/types";

export const STATUSES: TaskStatus[] = [...TASK_STATUSES];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Pendiente",
  todo: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueada",
  done: "Hecha",
  canceled: "Cancelada",
};

export const PRIORITY_LABEL = ["Sin prioridad", "Baja", "Media", "Urgente"];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function send<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText);
  return { data: data as T, headers: res.headers };
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return (await send<T>(method, path, body)).data;
}

export type TaskPage = { items: Task[]; next: string | null };

const PAGE_SIZE = "500";

async function tasksPage(
  query: Record<string, string>,
  cursor?: string,
): Promise<TaskPage> {
  const params = new URLSearchParams(query);
  if (cursor) params.set("cursor", cursor);
  const { data, headers } = await send<Task[]>("GET", `/api/tasks?${params}`);
  return { items: data, next: headers.get("X-Next-Cursor") };
}

async function tasks(query: Record<string, string>): Promise<Task[]> {
  const all: Task[] = [];
  let cursor: string | undefined;
  do {
    const page = await tasksPage({ limit: PAGE_SIZE, ...query }, cursor);
    all.push(...page.items);
    cursor = page.next ?? undefined;
  } while (cursor);
  return all;
}

export const api = {
  me: () => request<Me>("GET", "/api/me"),
  users: () => request<User[]>("GET", "/api/users"),
  teams: () => request<Team[]>("GET", "/api/teams"),
  team: (key: string) => request<TeamDetail>("GET", `/api/teams/${key}`),
  createTeam: (body: Record<string, unknown>) =>
    request<Team>("POST", "/api/teams", body),
  patchTeam: (key: string, body: Record<string, unknown>) =>
    request<Team>("PATCH", `/api/teams/${key}`, body),
  setMember: (key: string, userId: string, role: Member["role"]) =>
    request("PUT", `/api/teams/${key}/members/${userId}`, { role }),
  removeMember: (key: string, userId: string) =>
    request("DELETE", `/api/teams/${key}/members/${userId}`),
  createLabel: (body: Record<string, unknown>) =>
    request<{ id: string }>("POST", "/api/labels", body),
  projects: (team: string) =>
    request<Project[]>("GET", `/api/teams/${team}/projects`),
  createProject: (team: string, body: Record<string, unknown>) =>
    request<Project>("POST", `/api/teams/${team}/projects`, body),
  patchProject: (id: string, body: Record<string, unknown>) =>
    request<Project>("PATCH", `/api/projects/${id}`, body),
  labels: () =>
    request<(Label & { team_id: string | null })[]>("GET", "/api/labels"),
  tasks,
  tasksPage,
  task: (key: string) => request<TaskDetail>("GET", `/api/tasks/${key}`),
  createTask: (body: Record<string, unknown>) =>
    request<Task>("POST", "/api/tasks", body),
  patchTask: (key: string, body: Record<string, unknown>) =>
    request<Task>("PATCH", `/api/tasks/${key}`, body),
  comment: (key: string, body: string) =>
    request<{ id: string }>("POST", `/api/tasks/${key}/updates`, { body }),
  join: (key: string) => request("PUT", `/api/tasks/${key}/collaborators/me`),
  leave: (key: string) =>
    request("DELETE", `/api/tasks/${key}/collaborators/me`),
  calendar: (from: string, to: string) =>
    request<{ tasks: Task[]; events: CalEvent[] }>(
      "GET",
      `/api/calendar?from=${from}&to=${to}`,
    ),
  createEvent: (body: Record<string, unknown>) =>
    request<CalEvent>("POST", "/api/events", body),
  inbox: () =>
    request<{ unread: number; items: InboxItem[] }>("GET", "/api/inbox"),
  readInbox: () => request("POST", "/api/inbox/read"),
  overview: () =>
    request<{ teams: OverviewRow[]; owners: OverviewRow[] }>(
      "GET",
      "/api/overview",
    ),
  logout: () => request("POST", "/api/auth/logout"),
};
