import clsx from "clsx";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABEL, type Person, type Task, type TaskStatus } from "./api";
import { parseDay } from "./lib";

const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "var(--muted-foreground)",
  todo: "var(--foreground)",
  in_progress: "var(--primary)",
  blocked: "var(--destructive)",
  done: "var(--ok)",
  canceled: "var(--muted-foreground)",
};

export function StatusDot({ status }: { status: TaskStatus }) {
  const filled = status === "done" ? 1 : status === "in_progress" ? 0.5 : 0;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      role="img"
      aria-label={STATUS_LABEL[status]}
      className="shrink-0"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke={STATUS_COLOR[status]}
        strokeWidth="1.5"
        strokeDasharray={status === "backlog" ? "2 2" : undefined}
      />
      {filled > 0 && (
        <path
          d={
            filled === 1
              ? "M7 1.5A5.5 5.5 0 1 1 7 12.5A5.5 5.5 0 1 1 7 1.5Z"
              : "M7 3.5A3.5 3.5 0 0 1 7 10.5Z"
          }
          fill={STATUS_COLOR[status]}
        />
      )}
      {status === "canceled" && (
        <path
          d="M4.5 4.5l5 5M9.5 4.5l-5 5"
          stroke={STATUS_COLOR[status]}
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

export function Avatar({
  person,
  size = 20,
}: {
  person: Person | null;
  size?: number;
}) {
  if (!person)
    return (
      <span
        title="Unassigned"
        style={{ width: size, height: size }}
        className="inline-block shrink-0 rounded-full border border-dashed"
      />
    );
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return person.avatar_url ? (
    <img
      src={person.avatar_url}
      alt={person.name}
      title={person.name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-full"
    />
  ) : (
    <span
      title={person.name}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium"
    >
      {initials}
    </span>
  );
}

export function DueChip({ task, today }: { task: Task; today: string }) {
  if (!task.due_date) return null;
  const late =
    task.due_date < today &&
    task.status !== "done" &&
    task.status !== "canceled";
  const label = parseDay(task.due_date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <span
      className={clsx(
        "text-xs tabular-nums",
        late ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="inline-block h-1.5 w-14 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="block h-full bg-primary"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </span>
  );
}

export function TaskRow({
  task,
  today,
  onOpen,
  selected,
}: {
  task: Task;
  today: string;
  onOpen: (task: Task) => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={clsx(
        "flex w-full items-center gap-3 border-b px-4 py-2 text-left hover:bg-muted/60",
        selected && "bg-muted",
      )}
    >
      <StatusDot status={task.status} />
      <span className="w-16 shrink-0 text-xs text-muted-foreground">
        {task.key}
      </span>
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {task.visibility === "private" && (
        <Lock
          size={12}
          aria-label="Private"
          className="shrink-0 text-muted-foreground"
        />
      )}
      {task.subtask_count > 0 && <ProgressBar value={task.progress} />}
      <span className="hidden gap-1 sm:flex">
        {task.labels.map((l) => (
          <span
            key={l.id}
            className="rounded-full border px-1.5 text-xs"
            style={{ borderColor: l.color }}
          >
            {l.name}
          </span>
        ))}
      </span>
      <DueChip task={task} today={today} />
      <Avatar person={task.owner} />
    </button>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-px">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
          <div className="skeleton h-3.5 w-3.5 rounded-full" />
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      {children && (
        <p className="max-w-sm text-xs text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

export function Header({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex min-h-12 flex-wrap items-center gap-3 border-b px-4 py-2">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
      </div>
    </header>
  );
}

export const field = "h-8 rounded-md border bg-background px-2 text-xs";
export const button =
  "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted";
export const primaryButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90";
