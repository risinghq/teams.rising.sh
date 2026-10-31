// Row and payload types the API returns. The Worker builds them and the web
// client reads them.

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
  "canceled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

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
  reactions: Reaction[];
};

export type Reaction = {
  emoji: string;
  names: string[];
  mine: boolean;
};

export type TaskLink = {
  id: string;
  task_id: string;
  provider: string;
  kind: string;
  repo: string;
  external_id: string;
  url: string;
  title: string;
  state: string;
};

// `can_edit` and `can_delete` are the server's own rules applied to the caller,
// so the client offers only what will succeed.
export type TaskDetail = Task & {
  subtasks: Task[];
  collaborators: Person[];
  links: TaskLink[];
  updates: Update[];
  can_edit: boolean;
  can_delete: boolean;
};

export type Me = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  // A number stays unverified until its owner confirms it from WhatsApp.
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  is_admin: boolean;
  teams: { key: string; name: string; role: "leader" | "member" }[];
};

export type Team = {
  id: string;
  key: string;
  name: string;
  image_url: string | null;
  members: number;
};

export type Member = Person & { email: string; role: "leader" | "member" };
export type TeamDetail = Omit<Team, "members"> & { members: Member[] };

// The counts cover the tasks the caller may see. `open` excludes done and
// canceled tasks. `progress` is the share of done tasks among those not
// canceled, 0 when there are none. `next_due` is the earliest due date among
// open tasks.
export type ProjectCounts = {
  open: number;
  progress: number;
  next_due: string | null;
};

export type ProjectBase = {
  id: string;
  team_id: string;
  name: string;
  description: string;
  status: "active" | "done" | "archived";
  target_date: string | null;
};

export type Project = ProjectBase & ProjectCounts;

export type User = Person & {
  email: string;
  username: string | null;
  kind: string;
};

export type CalEvent = {
  id: string;
  team_id: string | null;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  google_event_id: string | null;
  meet_url: string | null;
  created_by: string;
  attendees: Person[];
};

// Busy intervals by person id. Without Google (`google: false`) only the
// person's Teams events count, so a free slot may not be free.
export type FreeBusy = Record<
  string,
  { busy: { start: string; end: string }[]; google: boolean }
>;

export type InboxItem = {
  id: string;
  kind: string;
  body: string;
  meta: Record<string, unknown>;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  task_key: string;
  task_title: string;
  unread: boolean;
  mentioned: boolean;
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
