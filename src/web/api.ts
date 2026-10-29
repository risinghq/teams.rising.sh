import type { TaskStatus } from "../shared/progress";
import { t } from "./i18n";

export type { TaskStatus };

export const STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
  "canceled",
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: t("Backlog"),
  todo: t("To do"),
  in_progress: t("In progress"),
  blocked: t("Blocked"),
  done: t("Done"),
  canceled: t("Canceled"),
};

export const PRIORITY_LABEL = [
  t("No priority"),
  t("Low"),
  t("Medium"),
  t("Urgent"),
];

export type Person = { id: string; name: string; avatar_url: string | null };
export type Label = { id: string; name: string; color: string };

export type Task = {
  id: string;
  key: string;
  team: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  visibility: "open" | "private";
  priority: number;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  parent_id: string | null;
  owner: Person | null;
  labels: Label[];
  progress: number;
  subtask_count: number;
  created_at: string;
  updated_at: string;
};

export type Update = {
  id: string;
  kind: string;
  body: string;
  meta: Record<string, unknown>;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
};

export type TaskLink = {
  id: string;
  kind: string;
  repo: string;
  external_id: string;
  url: string;
  title: string;
  state: string;
};

export type TaskDetail = Task & {
  subtasks: Task[];
  collaborators: Person[];
  links: TaskLink[];
  updates: Update[];
};

export type Me = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_admin: boolean;
  teams: { key: string; name: string; role: "leader" | "member" }[];
};

export type Team = {
  id: string;
  key: string;
  name: string;
  description: string;
  members: number;
};

export type Member = Person & { email: string; role: "leader" | "member" };
export type TeamDetail = Omit<Team, "members"> & { members: Member[] };

export type Project = {
  id: string;
  team_id: string;
  name: string;
  description: string;
  status: "active" | "done" | "archived";
  target_date: string | null;
};

export type User = Person & { email: string; kind: string };

export type CalEvent = {
  id: string;
  team_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
};

export type InboxItem = {
  id: string;
  kind: string;
  body: string;
  meta: Record<string, unknown>;
  created_at: string;
  author_name: string | null;
  task_key: string;
  task_title: string;
  unread: boolean;
};

export type OverviewRow = {
  key?: string;
  id?: string;
  name: string;
  avatar_url?: string | null;
  open: number;
  blocked: number;
  overdue: number;
  done: number;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  if (!res.ok) throw new ApiError(res.status, t(data?.error ?? res.statusText));
  return data as T;
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
  tasks: (query: Record<string, string>) =>
    request<Task[]>("GET", `/api/tasks?${new URLSearchParams(query)}`),
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
