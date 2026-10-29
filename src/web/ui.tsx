import clsx from "clsx";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABEL, type Person, type Task, type TaskStatus } from "./api";
import { day, linkify, parseDay } from "./lib";

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
        title="Sin asignar"
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
  const label = day(parseDay(task.due_date), {
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
          aria-label="Privada"
          className="shrink-0 text-muted-foreground"
        />
      )}
      {task.subtask_count > 0 && <ProgressBar value={task.progress} />}
      <span className="hidden gap-1 sm:flex">
        {task.labels.map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
      </span>
      <DueChip task={task} today={today} />
      <Avatar person={task.owner} />
    </button>
  );
}

// Free text with its URLs as links, such as a paper or a spreadsheet.
export function LinkedText({ text }: { text: string }) {
  return linkify(text).map((s, i) =>
    s.url ? (
      <a
        key={i}
        href={s.url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {s.text}
      </a>
    ) : (
      s.text
    ),
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
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex min-h-12 flex-wrap items-center gap-3 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {/* One scrolling row on phones so filters don't push the list down. */}
      <div className="ml-auto flex max-w-full items-center gap-2 overflow-x-auto p-0.5 sm:flex-wrap [&>*]:shrink-0">
        {children}
      </div>
    </header>
  );
}

export const field =
  "h-8 rounded-md border bg-background px-2 text-xs transition-colors hover:border-foreground/30";
export const button =
  "press inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-3 text-xs font-medium hover:bg-muted";
export const primaryButton =
  "press inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary)_88%,black)] disabled:opacity-50";

// Hues for team marks, spaced so neighbours in the sidebar rarely match.
const MARK_HUES = [265, 200, 150, 35, 330, 95, 235, 10];

// A colored square with the team's initial, so teams are told apart at a
// glance. The color comes from the key, so it is stable everywhere.
export function TeamMark({
  teamKey,
  size = 20,
}: {
  teamKey: string;
  size?: number;
}) {
  const hash = [...teamKey].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7);
  const hue = MARK_HUES[Math.abs(hash) % MARK_HUES.length];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `oklch(0.6 0.13 ${hue})`,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold text-white"
    >
      {teamKey[0]}
    </span>
  );
}

// A label as a tinted pill with a dot in its color. The tint keeps the text
// readable whatever color the label has.
export function LabelChip({
  label,
}: {
  label: { name: string; color: string };
}) {
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs"
      style={{
        background: `color-mix(in oklch, ${label.color} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: label.color }}
      />
      {label.name}
    </span>
  );
}
