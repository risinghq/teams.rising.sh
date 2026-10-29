import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type CalEvent, type OverviewRow, type Task } from "./api";
import { today, useInbox, useOpenTask, usePatchTask } from "./data";
import {
  addDays,
  dropOnDay,
  iso,
  monthGrid,
  parseDay,
  relativeTime,
  weekGrid,
} from "./lib";
import { day, t as tr } from "./i18n";
import { WithPanel } from "./team";
import {
  Avatar,
  button,
  Empty,
  Header,
  LanguageSwitch,
  Skeleton,
  StatusDot,
} from "./ui";

export function Calendar() {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(today());
  const days = mode === "month" ? monthGrid(anchor) : weekGrid(anchor);
  const from = days[0] as string;
  const to = days[days.length - 1] as string;
  const q = useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => api.calendar(from, to),
  });
  const patch = usePatchTask();
  const open = useOpenTask();
  const t = today();
  const [over, setOver] = useState<string | null>(null);

  const step = (dir: 1 | -1) => {
    if (mode === "week") return setAnchor(addDays(anchor, 7 * dir));
    const d = parseDay(anchor);
    d.setMonth(d.getMonth() + dir, 1);
    setAnchor(iso(d));
  };
  const title = day(parseDay(anchor), {
    month: "long",
    year: "numeric",
  });

  const tasksOn = (day: string) =>
    (q.data?.tasks ?? []).filter((x) => x.due_date === day);
  const eventsOn = (day: string): CalEvent[] =>
    (q.data?.events ?? []).filter((e) => e.starts_at.slice(0, 10) === day);

  return (
    <WithPanel>
      <Header title={title}>
        <button
          type="button"
          aria-label={tr("Previous")}
          className={button}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={14} />
        </button>
        <button type="button" className={button} onClick={() => setAnchor(t)}>
          {tr("Today")}
        </button>
        <button
          type="button"
          aria-label={tr("Next")}
          className={button}
          onClick={() => step(1)}
        >
          <ChevronRight size={14} />
        </button>
        <div
          className="flex rounded-md border"
          role="group"
          aria-label={tr("Range")}
        >
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={clsx(
                "px-3 py-1.5 text-xs capitalize",
                mode === m && "bg-muted",
              )}
            >
              {tr(m)}
            </button>
          ))}
        </div>
      </Header>
      <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {tr(d)}
          </div>
        ))}
      </div>
      <div
        className={clsx(
          "grid grid-cols-7",
          mode === "month"
            ? "auto-rows-[minmax(6rem,1fr)]"
            : "auto-rows-[minmax(16rem,1fr)]",
        )}
      >
        {days.map((day) => {
          const inMonth =
            mode === "week" || day.slice(0, 7) === anchor.slice(0, 7);
          return (
            <div
              key={day}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(day);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const task = q.data?.tasks.find(
                  (x) => x.key === e.dataTransfer.getData("text/task"),
                );
                const drop = task && dropOnDay(task, day);
                if (drop) patch.mutate(drop);
              }}
              className={clsx(
                "min-w-0 border-b border-r p-1",
                !inMonth && "bg-sidebar text-muted-foreground",
                over === day && "ring-2 ring-inset ring-primary",
              )}
            >
              <span
                className={clsx(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs",
                  day === t && "bg-primary text-primary-foreground",
                )}
              >
                {parseDay(day).getDate()}
              </span>
              <ul className="mt-1 space-y-0.5">
                {eventsOn(day).map((e) => (
                  <li
                    key={e.id}
                    className="truncate rounded-sm bg-primary/15 px-1 text-xs"
                  >
                    {e.title}
                  </li>
                ))}
                {tasksOn(day).map((task) => (
                  <li key={task.key}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/task", task.key)
                      }
                      onClick={() => open(task)}
                      className="flex w-full items-center gap-1 truncate rounded-sm border bg-background px-1 text-left text-xs hover:border-primary"
                    >
                      <StatusDot status={task.status} />
                      <span className="truncate">{task.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </WithPanel>
  );
}

export function Inbox() {
  const q = useInbox();
  const navigate = useNavigate();
  // Opening the inbox reads it. The dots stay until the next visit because the
  // items keep the unread flag from this fetch.
  useEffect(() => {
    if (q.data && q.data.unread > 0) void api.readInbox();
  }, [q.data]);
  return (
    <div>
      <Header title={tr("Inbox")} />
      {q.isPending ? (
        <Skeleton />
      ) : q.data?.items.length === 0 ? (
        <Empty title={tr("All caught up")}>
          {tr("Mentions and changes to tasks you follow land here.")}
        </Empty>
      ) : (
        <ul>
          {q.data?.items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  const [team, number] = i.task_key.split("-");
                  void navigate({
                    to: "/t/$team/$number",
                    params: { team: team ?? "", number: number ?? "" },
                  });
                }}
                className="flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-muted/60"
              >
                <span
                  className={clsx(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    i.unread ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {i.task_key} · {i.author_name ?? tr("System")} ·{" "}
                    {relativeTime(i.created_at)}
                  </span>
                  <span className="block truncate">{i.task_title}</span>
                  {i.body && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {i.body}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={clsx(
          "text-sm font-semibold tabular-nums",
          value > 0 && tone,
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Rows({ rows, link }: { rows: OverviewRow[]; link?: boolean }) {
  return (
    <ul>
      {rows.map((r) => {
        const body = (
          <>
            {r.avatar_url !== undefined && (
              <Avatar
                person={{
                  id: r.id ?? "",
                  name: r.name,
                  avatar_url: r.avatar_url,
                }}
                size={24}
              />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">
              {r.name}
            </span>
            <Stat label={tr("Open")} value={r.open} />
            <Stat
              label={tr("Blocked")}
              value={r.blocked}
              tone="text-destructive"
            />
            <Stat
              label={tr("Overdue")}
              value={r.overdue}
              tone="text-destructive"
            />
            <Stat label={tr("Done")} value={r.done} />
          </>
        );
        const cls = "flex items-center gap-4 border-b px-4 py-3";
        return (
          <li key={r.key ?? r.id}>
            {link && r.key ? (
              <Link
                to="/t/$team"
                params={{ team: r.key }}
                className={clsx(cls, "hover:bg-muted/60")}
              >
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Overview() {
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  return (
    <div>
      <Header title={tr("Overview")} />
      {q.isPending ? (
        <Skeleton />
      ) : (
        <>
          <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
            {tr("Teams")}
          </h2>
          <Rows rows={q.data?.teams ?? []} link />
          <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
            {tr("People")}
          </h2>
          <Rows rows={q.data?.owners ?? []} />
        </>
      )}
    </div>
  );
}

export function Login() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center">
        <h1 className="text-lg font-semibold">Teams</h1>
        <p className="text-xs text-muted-foreground">
          {tr("See what is pending, who owns it and how far along it is.")}
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {tr("Continue with Google")}
        </a>
        <LanguageSwitch />
      </div>
    </div>
  );
}

export type { Task };
