import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { CalEvent } from "@shared/types";
import { cn } from "@/lib/cn";
import {
  addDays,
  day,
  monthGrid,
  parseDay,
  stepMonth,
  today,
  weekGrid,
} from "@/lib/dates";
import { dropOnDay } from "@/lib/tasks";
import { useSearchParams } from "@/hooks/use-search-params";
import { usePatchTask } from "@/features/tasks/hooks";
import { TaskLink } from "@/features/tasks/task-link";
import { TaskRow } from "@/features/tasks/task-row";
import { WithPanel } from "@/features/tasks/with-panel";
import { buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { GroupHeading, Page, PageHeader } from "@/ui/page-header";
import { SegmentedControl } from "@/ui/segmented-control";
import { StatusDot } from "@/ui/status-dot";
import { useCalendar } from "./hooks";
import { parseCalendarSearch, type CalendarSearch } from "./search";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const parse = (raw: Record<string, unknown>) =>
  parseCalendarSearch(raw, today());

const NAV_BUTTON = buttonVariants({ variant: "outline", size: "icon" });

export function CalendarPage() {
  const { search } = useSearchParams(parse);
  const now = today();
  const mode = search.mode ?? "month";
  const anchor = search.date ?? now;
  const days = mode === "month" ? monthGrid(anchor) : weekGrid(anchor);
  const q = useCalendar(days[0] as string, days[days.length - 1] as string);
  const patch = usePatchTask();
  const [over, setOver] = useState<string | null>(null);

  // Build range-changing links explicitly because `parse` drops defaults.
  const go =
    (next: Partial<CalendarSearch>) => (prev: Record<string, unknown>) => ({
      ...prev,
      ...next,
      ...("date" in next && next.date === now && { date: undefined }),
    });
  const stepped = (dir: 1 | -1) =>
    mode === "week" ? addDays(anchor, 7 * dir) : stepMonth(anchor, dir);

  const tasksOn = (d: string) =>
    (q.data?.tasks ?? []).filter((x) => x.due_date === d);
  const eventsOn = (d: string): CalEvent[] =>
    (q.data?.events ?? []).filter((e) => e.starts_at.slice(0, 10) === d);
  const busy = days.filter((d) => tasksOn(d).length + eventsOn(d).length > 0);

  return (
    <WithPanel>
      <Page width="wide">
        <PageHeader
          title={day(parseDay(anchor), { month: "long", year: "numeric" })}
          action={
            <>
              <Link
                to="."
                search={go({ date: stepped(-1) })}
                aria-label="Anterior"
                className={NAV_BUTTON}
              >
                <ChevronLeft />
              </Link>
              <Link
                to="."
                search={go({ date: undefined })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Hoy
              </Link>
              <Link
                to="."
                search={go({ date: stepped(1) })}
                aria-label="Siguiente"
                className={NAV_BUTTON}
              >
                <ChevronRight />
              </Link>
            </>
          }
          controls={
            <SegmentedControl
              legend="Rango"
              value={mode}
              options={[
                { value: "month", label: "Mes" },
                { value: "week", label: "Semana" },
              ]}
              renderOption={({ value }, props) => (
                <Link
                  {...props}
                  to="."
                  search={go({ mode: value === "week" ? "week" : undefined })}
                />
              )}
            />
          }
        />

        <div className="hidden sm:block">
          <div className="grid grid-cols-7 pb-2 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div
            className={cn(
              "grid grid-cols-7 overflow-hidden rounded-xl border",
              mode === "month"
                ? "auto-rows-[minmax(7rem,1fr)]"
                : "auto-rows-[minmax(18rem,1fr)]",
            )}
          >
            {days.map((d) => {
              const inMonth =
                mode === "week" || d.slice(0, 7) === anchor.slice(0, 7);
              return (
                <div
                  key={d}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(d);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const task = q.data?.tasks.find(
                      (x) => x.key === e.dataTransfer.getData("text/task"),
                    );
                    const drop = task && dropOnDay(task, d);
                    if (task && drop)
                      patch.mutate({ ...drop, parentId: task.parent_id });
                  }}
                  className={cn(
                    "min-w-0 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-sidebar text-muted-foreground",
                    over === d && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                      d === now && "bg-primary text-primary-foreground",
                    )}
                  >
                    {parseDay(d).getDate()}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {eventsOn(d).map((e) => (
                      <li
                        key={e.id}
                        className="truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-xs"
                      >
                        {e.title}
                      </li>
                    ))}
                    {tasksOn(d).map((task) => (
                      <li key={task.key}>
                        <TaskLink
                          task={task}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("text/task", task.key)
                          }
                          className="flex items-center gap-1.5 truncate rounded-md bg-surface px-1.5 py-0.5 text-xs shadow-card transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <StatusDot status={task.status} />
                          <span className="truncate">{task.title}</span>
                        </TaskLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* A grid of seven columns does not fit a phone, so the same days read
            as an agenda: only the days that have something. */}
        <div className="sm:hidden">
          {q.isPending ? null : busy.length === 0 ? (
            <EmptyState
              title="Nada en este periodo"
              action={
                <Link
                  to="."
                  search={go({ date: undefined })}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Volver a hoy
                </Link>
              }
            >
              Las tareas con fecha de entrega y los eventos aparecen aquí.
            </EmptyState>
          ) : (
            busy.map((d) => (
              <section key={d}>
                <GroupHeading>
                  {day(parseDay(d), {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </GroupHeading>
                {eventsOn(d).map((e) => (
                  <p key={e.id} className="px-3 py-2.5 text-sm">
                    {e.title}
                  </p>
                ))}
                {tasksOn(d).map((task) => (
                  <TaskRow
                    key={task.key}
                    task={task}
                    today={now}
                    selected={search.task === task.key}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </Page>
    </WithPanel>
  );
}
