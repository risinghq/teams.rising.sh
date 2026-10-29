import { useNavigate, useSearch } from "@tanstack/react-router";
import clsx from "clsx";
import { LayoutList, Columns3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api, STATUS_LABEL, STATUSES, type Task, type TaskStatus } from "./api";
import {
  today,
  useLabels,
  useOpenTask,
  usePatchTask,
  useProjects,
  useTasks,
  useUsers,
  useWrite,
} from "./data";
import { filterTasks, groupByDue, NO_FILTERS, type Filters } from "./lib";
import { TaskView } from "./task";
import {
  Avatar,
  DueChip,
  Empty,
  field,
  Header,
  primaryButton,
  Skeleton,
  StatusDot,
  TaskRow,
} from "./ui";

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
  const t = today();
  const search = useSearch({ strict: false }) as { task?: string };
  return (
    <WithPanel>
      <Header title="My work" />
      {q.isPending ? (
        <Skeleton />
      ) : q.data?.length === 0 ? (
        <Empty title="Nothing on your plate">
          Tasks you own show here, grouped by when they are due.
        </Empty>
      ) : (
        groupByDue(q.data ?? [], t).map((g) => (
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
                today={t}
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
  const labels = useLabels();
  const projects = useProjects(team);
  const open = useOpenTask();
  const t = today();
  const search = useSearch({ strict: false }) as { task?: string };
  const shown = filterTasks(tasks.data ?? [], filters);
  const set = (k: keyof Filters) => (e: { target: { value: string } }) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <WithPanel>
      <Header title={team}>
        <select
          aria-label="Owner filter"
          className={field}
          value={filters.owner}
          onChange={set("owner")}
        >
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {users.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Status filter"
          className={field}
          value={filters.status}
          onChange={set("status")}
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Label filter"
          className={field}
          value={filters.label}
          onChange={set("label")}
        >
          <option value="">Any label</option>
          {labels.data?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Project filter"
          className={field}
          value={filters.project}
          onChange={set("project")}
        >
          <option value="">Any project</option>
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-md border" role="group" aria-label="View">
          {(
            [
              ["list", LayoutList],
              ["board", Columns3],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              type="button"
              aria-label={`${id} view`}
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={clsx("p-1.5", view === id && "bg-muted")}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </Header>
      <NewTask team={team} />
      {tasks.isPending ? (
        <Skeleton />
      ) : shown.length === 0 ? (
        <Empty title="No tasks here">
          Add one above, or clear the filters.
        </Empty>
      ) : view === "list" ? (
        groupByDue(shown, t).map((g) => (
          <section key={g.id}>
            <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
              {g.label}{" "}
              <span className="text-muted-foreground">{g.items.length}</span>
            </h2>
            {g.items.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                today={t}
                onOpen={open}
                selected={search.task === task.key}
              />
            ))}
          </section>
        ))
      ) : (
        <Board tasks={shown} today={t} onOpen={open} />
      )}
    </WithPanel>
  );
}

function NewTask({ team }: { team: string }) {
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
          { team, title: value },
          { onSuccess: () => setTitle("") },
        );
      }}
    >
      <input
        aria-label="New task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter"
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {title.trim() && (
        <button
          type="submit"
          className={primaryButton}
          disabled={create.isPending}
        >
          Add
        </button>
      )}
    </form>
  );
}

function Board({
  tasks,
  today: t,
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
                  <DueChip task={task} today={t} />
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
