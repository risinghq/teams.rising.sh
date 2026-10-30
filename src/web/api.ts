import type {
  CalEvent,
  InboxItem,
  Label,
  Me,
  Member,
  OverviewRow,
  Project,
  ProjectBase,
  Task,
  TaskDetail,
  Team,
  TeamDetail,
  User,
} from "@shared/types";

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

export type TaskQuery = Record<string, string>;

async function tasksPage(query: TaskQuery, cursor?: string): Promise<TaskPage> {
  const params = new URLSearchParams(query);
  if (cursor) params.set("cursor", cursor);
  const { data, headers } = await send<Task[]>("GET", `/api/tasks?${params}`);
  return { items: data, next: headers.get("X-Next-Cursor") };
}

// The body is the file itself; the server reads its type from content-type.
async function upload(file: Blob): Promise<{ url: string }> {
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "content-type": file.type },
    body: file,
  });
  const data = (await res.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText);
  return { url: data?.url ?? "" };
}

export const api = {
  me: () => request<Me>("GET", "/api/me"),
  patchMe: (body: Record<string, unknown>) =>
    request<Me>("PATCH", "/api/me", body),
  upload,
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
    request<ProjectBase>("POST", `/api/teams/${team}/projects`, body),
  patchProject: (id: string, body: Record<string, unknown>) =>
    request<ProjectBase>("PATCH", `/api/projects/${id}`, body),
  labels: () =>
    request<(Label & { team_id: string | null })[]>("GET", "/api/labels"),
  tasksPage,
  task: (key: string) => request<TaskDetail>("GET", `/api/tasks/${key}`),
  createTask: (body: Record<string, unknown>) =>
    request<Task>("POST", "/api/tasks", body),
  patchTask: (key: string, body: Record<string, unknown>) =>
    request<Task>("PATCH", `/api/tasks/${key}`, body),
  comment: (key: string, body: string) =>
    request<{ id: string }>("POST", `/api/tasks/${key}/updates`, { body }),
  react: (key: string, updateId: string, emoji: string, on: boolean) =>
    request(
      on ? "PUT" : "DELETE",
      `/api/tasks/${key}/updates/${updateId}/reactions/${encodeURIComponent(emoji)}`,
    ),
  addCollaborator: (key: string, userId: string) =>
    request("PUT", `/api/tasks/${key}/collaborators/${userId}`),
  removeCollaborator: (key: string, userId: string) =>
    request("DELETE", `/api/tasks/${key}/collaborators/${userId}`),
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
  readInboxTask: (key: string) => request("POST", `/api/inbox/read/${key}`),
  overview: () =>
    request<{ teams: OverviewRow[]; owners: OverviewRow[] }>(
      "GET",
      "/api/overview",
    ),
  logout: () => request("POST", "/api/auth/logout"),
};
