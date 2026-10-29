import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowLeft, Columns3, LayoutList, Plus, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  api,
  STATUS_LABEL,
  STATUSES,
  type Project,
  type Task,
  type TaskStatus,
} from "./api";
import {
  today,
  useLabels,
  useMe,
  useOpenTask,
  usePatchTask,
  useProjects,
  useTasks,
  useTeams,
  useUsers,
  useWrite,
} from "./data";
import {
  filterTasks,
  groupByDue,
  NO_FILTERS,
  parseDay,
  summarizeProjects,
  type Filters,
  type ProjectSummary,
} from "./lib";
import { day, t } from "./i18n";
import { TaskView } from "./task";
import {
  Avatar,
  button,
  DueChip,
  Empty,
  field,
  Header,
  LinkedText,
  primaryButton,
  ProgressBar,
  Skeleton,
  StatusDot,
  TaskRow,
} from "./ui";

const shortDay = (s: string) =>
  day(parseDay(s), { month: "short", day: "numeric" });

const formInput = "h-9 rounded-md border bg-background px-2 text-sm";

// A list page with an optional side panel. The panel opens from `?task=KEY`.
export function WithPanel({ children }: { children: ReactNode }) {
  const search = useSearch({ strict: false }) as { task?: string };
  const navigate = useNavigate();
  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      {search.task && (
        <aside className="hidden w-[420px] shrink-0 overflow-y-auto border-l md:block">
          <TaskView
            taskKey={search.task}
            onClose={() =>
              void navigate({
                to: ".",
                search: (p: Record<string, unknown>) => ({
                  ...p,
                  task: undefined,
                }),
              })
            }
          />
        </aside>
      )}
    </div>
  );
}

export function MyWork() {
  const q = useTasks({ owner: "me", open: "1" });
  const open = useOpenTask();
  const now = today();
  const search = useSearch({ strict: false }) as { task?: string };
  return (
    <WithPanel>
      <Header title={t("My work")} />
      {q.isPending ? (
        <Skeleton />
      ) : q.data?.length === 0 ? (
        <Empty title={t("Nothing on your plate")}>
          {t("Tasks you own show here, grouped by when they are due.")}
        </Empty>
      ) : (
        groupByDue(q.data ?? [], now).map((g) => (
          <section key={g.id}>
            <h2
              className={clsx(
                "border-b bg-sidebar px-4 py-1.5 text-xs font-medium",
                g.id === "overdue" && "text-destructive",
              )}
            >
              {g.label}{" "}
              <span className="text-muted-foreground">{g.items.length}</span>
            </h2>
            {g.items.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                today={now}
                onOpen={open}
                selected={search.task === task.key}
              />
            ))}
          </section>
        ))
      )}
    </WithPanel>
  );
}

export function TeamPage({ team }: { team: string }) {
  const [view, setView] = useState<"list" | "board">("list");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const tasks = useTasks({ team, top: "1" });
  const users = useUsers();
  const projects = useProjects(team);
  const teamRow = useTeams().data?.find((x) => x.key === team);
  const name = teamRow?.name ?? team;
  // Labels of this team plus the shared ones, not other teams' labels.
  const labels = useLabels().data?.filter(
    (l) => l.team_id === null || l.team_id === teamRow?.id,
  );
  const me = useMe().data;
  const role = me?.is_admin
    ? "leader"
    : me?.teams.find((x) => x.key === team)?.role;
  const open = useOpenTask();
  const now = today();
  const search = useSearch({ strict: false }) as { task?: string };
  const shown = filterTasks(tasks.data ?? [], filters);
  const set = (k: keyof Filters) => (e: { target: { value: string } }) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  const pick = (project: string) => setFilters((f) => ({ ...f, project }));
  const current = projects.data?.find((p) => p.id === filters.project);

  return (
    <WithPanel>
      <Header title={name}>
        <select
          aria-label={t("Owner filter")}
          className={field}
          value={filters.owner}
          onChange={set("owner")}
        >
          <option value="">{t("Any owner")}</option>
          <option value="none">{t("Unassigned")}</option>
          {users.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t("Status filter")}
          className={field}
          value={filters.status}
          onChange={set("status")}
        >
          <option value="">{t("Any status")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          aria-label={t("Label filter")}
          className={field}
          value={filters.label}
          onChange={set("label")}
        >
          <option value="">{t("Any label")}</option>
          {labels?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t("Project filter")}
          className={field}
          value={filters.project}
          onChange={set("project")}
        >
          <option value="">{t("Any project")}</option>
          <option value="none">{t("No project")}</option>
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div
          className="flex rounded-md border"
          role="group"
          aria-label={t("View")}
        >
          {(
            [
              ["list", LayoutList],
              ["board", Columns3],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              type="button"
              aria-label={id === "list" ? t("List view") : t("Board view")}
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={clsx("p-1.5", view === id && "bg-muted")}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        {role === "leader" && (
          <Link
            to="/t/$team/settings"
            params={{ team }}
            aria-label={t("Team settings")}
            className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-muted"
          >
            <Settings size={14} />
          </Link>
        )}
      </Header>
      {current || filters.project === "none" ? (
        <ProjectHeader
          project={current ?? null}
          canEdit={role === "leader"}
          onBack={() => pick("")}
        />
      ) : (
        !filters.project && (
          <ProjectList
            team={team}
            summary={summarizeProjects(projects.data ?? [], tasks.data ?? [])}
            canCreate={role !== undefined}
            onPick={pick}
          />
        )
      )}
      <NewTask team={team} project={current?.id} />
      {tasks.isPending ? (
        <Skeleton />
      ) : shown.length === 0 ? (
        <Empty title={t("No tasks here")}>
          {t("Add one above, or clear the filters.")}
        </Empty>
      ) : view === "list" ? (
        groupByDue(shown, now).map((g) => (
          <section key={g.id}>
            <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
              {g.label}{" "}
              <span className="text-muted-foreground">{g.items.length}</span>
            </h2>
            {g.items.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                today={now}
                onOpen={open}
                selected={search.task === task.key}
              />
            ))}
          </section>
        ))
      ) : (
        <Board tasks={shown} today={now} onOpen={open} />
      )}
    </WithPanel>
  );
}

// The team's live projects and areas, and the tasks outside them. Picking one
// filters the list below.
function ProjectList({
  team,
  summary,
  canCreate,
  onPick,
}: {
  team: string;
  summary: ReturnType<typeof summarizeProjects>;
  canCreate: boolean;
  onPick: (project: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const create = useWrite((body: Record<string, unknown>) =>
    api.createProject(team, body),
  );
  const empty = summary.projects.length === 0 && summary.areas.length === 0;
  if (empty && !canCreate) return null;
  return (
    <section className="border-b">
      {(
        [
          [t("Projects"), summary.projects],
          [t("Areas"), summary.areas],
        ] as const
      ).map(
        ([title, rows]) =>
          rows.length > 0 && (
            <div key={title}>
              <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
                {title}{" "}
                <span className="text-muted-foreground">{rows.length}</span>
              </h2>
              {rows.map((s) => (
                <ProjectRow key={s.project.id} summary={s} onPick={onPick} />
              ))}
            </div>
          ),
      )}
      {!empty && summary.loose > 0 && (
        <button
          type="button"
          onClick={() => onPick("none")}
          className="flex w-full items-center gap-3 border-b px-4 py-2 text-left text-muted-foreground hover:bg-muted/60"
        >
          <span className="flex-1">{t("No project")}</span>
          <span className="text-xs tabular-nums">
            {t("{n} open", { n: summary.loose })}
          </span>
        </button>
      )}
      {canCreate &&
        (adding ? (
          <ProjectForm
            pending={create.isPending}
            onCancel={() => setAdding(false)}
            onSave={(body) =>
              create.mutate(body, { onSuccess: () => setAdding(false) })
            }
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/60"
          >
            <Plus size={14} /> {t("New project or area")}
          </button>
        ))}
    </section>
  );
}

function ProjectRow({
  summary: { project, open, progress, nextDue },
  onPick,
}: {
  summary: ProjectSummary;
  onPick: (project: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(project.id)}
      className="flex w-full items-center gap-3 border-b px-4 py-2 text-left hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1 truncate font-medium">
        {project.name}
      </span>
      {project.target_date ? (
        <>
          <ProgressBar value={progress} />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(progress * 100)}%
          </span>
          <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
            {shortDay(project.target_date)}
          </span>
        </>
      ) : (
        <span className="text-xs tabular-nums text-muted-foreground">
          {nextDue
            ? t("{n} open · next {date}", { n: open, date: shortDay(nextDue) })
            : t("{n} open", { n: open })}
        </span>
      )}
    </button>
  );
}

// The picked project, or the tasks outside any project when `project` is null.
function ProjectHeader({
  project,
  canEdit,
  onBack,
}: {
  project: Project | null;
  canEdit: boolean;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = useWrite((body: Record<string, unknown>) =>
    api.patchProject(project?.id ?? "", body),
  );
  if (editing && project)
    return (
      <section className="border-b">
        <ProjectForm
          project={project}
          pending={save.isPending}
          onCancel={() => setEditing(false)}
          onSave={(body) =>
            save.mutate(body, { onSuccess: () => setEditing(false) })
          }
        />
      </section>
    );
  return (
    <section className="flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("All projects")}
          onClick={onBack}
          className="-ml-2 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-semibold">{project?.name ?? t("No project")}</h2>
        <span className="text-xs text-muted-foreground">
          {!project
            ? t("Ideas, papers and other loose tasks")
            : project.target_date
              ? t("Target {date}", { date: shortDay(project.target_date) })
              : t("Ongoing area")}
          {project && project.status !== "active" && ` · ${t(project.status)}`}
        </span>
        {project && canEdit && (
          <button
            type="button"
            className={clsx(button, "ml-auto")}
            onClick={() => setEditing(true)}
          >
            {t("Edit")}
          </button>
        )}
      </div>
      {project?.description && (
        <p className="whitespace-pre-wrap text-sm">
          <LinkedText text={project.description} />
        </p>
      )}
    </section>
  );
}

// Creates a project, or edits one when `project` is given. An empty target date
// makes an area.
function ProjectForm({
  project,
  pending,
  onSave,
  onCancel,
}: {
  project?: Project;
  pending: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [target, setTarget] = useState(project?.target_date ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  return (
    <form
      className="flex flex-col gap-2 px-4 py-3"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          name: name.trim(),
          target_date: target || null,
          description,
          ...(project && { status }),
        });
      }}
    >
      <input
        aria-label={t("Project name")}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("Name")}
        className={formInput}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <input
          type="date"
          aria-label={t("Target date")}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={formInput}
        />
        {t("Leave the date empty for an ongoing area.")}
        {project && (
          <select
            aria-label={t("Project status")}
            className={clsx(field, "ml-auto")}
            value={status}
            onChange={(e) => setStatus(e.target.value as Project["status"])}
          >
            <option value="active">{t("Active")}</option>
            <option value="done">{t("Done")}</option>
            <option value="archived">{t("Archived")}</option>
          </select>
        )}
      </div>
      <textarea
        aria-label={t("Project description")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("What it is, plus links to its repo or spreadsheet")}
        rows={3}
        className="rounded-md border bg-background px-2 py-1.5 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button type="button" className={button} onClick={onCancel}>
          {t("Cancel")}
        </button>
        <button
          type="submit"
          className={primaryButton}
          disabled={pending || !name.trim()}
        >
          {project ? t("Save") : t("Create")}
        </button>
      </div>
    </form>
  );
}

function NewTask({ team, project }: { team: string; project?: string }) {
  const [title, setTitle] = useState("");
  const create = useWrite((body: Record<string, unknown>) =>
    api.createTask(body),
  );
  return (
    <form
      className="flex gap-2 border-b px-4 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = title.trim();
        if (!value) return;
        create.mutate(
          { team, title: value, project_id: project },
          { onSuccess: () => setTitle("") },
        );
      }}
    >
      <input
        aria-label={t("New task title")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("Add a task and press Enter")}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {title.trim() && (
        <button
          type="submit"
          className={primaryButton}
          disabled={create.isPending}
        >
          {t("Add")}
        </button>
      )}
    </form>
  );
}

function Board({
  tasks,
  today: now,
  onOpen,
}: {
  tasks: Task[];
  today: string;
  onOpen: (task: Task) => void;
}) {
  const patch = usePatchTask();
  const [over, setOver] = useState<TaskStatus | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {STATUSES.map((status) => {
        const column = tasks.filter((x) => x.status === status);
        return (
          <section
            key={status}
            aria-label={STATUS_LABEL[status]}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const key = e.dataTransfer.getData("text/task");
              const task = tasks.find((x) => x.key === key);
              if (task && task.status !== status)
                patch.mutate({ key, patch: { status } });
            }}
            className={clsx(
              "flex w-64 shrink-0 flex-col gap-2 rounded-lg bg-sidebar p-2",
              over === status && "ring-2 ring-primary",
            )}
          >
            <h2 className="flex items-center gap-2 px-1 text-xs font-medium">
              <StatusDot status={status} /> {STATUS_LABEL[status]}
              <span className="text-muted-foreground">{column.length}</span>
            </h2>
            {column.map((task) => (
              <button
                key={task.key}
                type="button"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/task", task.key)
                }
                onClick={() => onOpen(task)}
                className="flex flex-col gap-2 rounded-md border bg-background p-2 text-left hover:border-primary"
              >
                <span className="text-xs text-muted-foreground">
                  {task.key}
                </span>
                <span>{task.title}</span>
                <span className="flex items-center justify-between">
                  <DueChip task={task} today={now} />
                  <Avatar person={task.owner} size={18} />
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
