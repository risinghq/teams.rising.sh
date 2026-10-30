import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { CalEvent } from "@/api";
import { useSearchParams } from "@/hooks/use-search-params";
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
import { useOpenTask, usePatchTask } from "@/features/tasks/hooks";
import { WithPanel } from "@/features/tasks/with-panel";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { PageHeader } from "@/ui/page-header";
import { SegmentedControl } from "@/ui/segmented-control";
import { StatusDot } from "@/ui/status-dot";
import { useCalendar } from "./hooks";
import { parseCalendarSearch } from "./search";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const parse = (raw: Record<string, unknown>) =>
  parseCalendarSearch(raw, today());

export function CalendarPage() {
  const { search, push } = useSearchParams(parse);
  const now = today();
  const mode = search.mode ?? "month";
  const anchor = search.date ?? now;
  const days = mode === "month" ? monthGrid(anchor) : weekGrid(anchor);
  const q = useCalendar(days[0] as string, days[days.length - 1] as string);
  const patch = usePatchTask();
  const open = useOpenTask();
  const [over, setOver] = useState<string | null>(null);

  const step = (dir: 1 | -1) =>
    push({
      date: mode === "week" ? addDays(anchor, 7 * dir) : stepMonth(anchor, dir),
    });

  const tasksOn = (d: string) =>
    (q.data?.tasks ?? []).filter((x) => x.due_date === d);
  const eventsOn = (d: string): CalEvent[] =>
    (q.data?.events ?? []).filter((e) => e.starts_at.slice(0, 10) === d);

  return (
    <WithPanel>
      <PageHeader
        title={day(parseDay(anchor), { month: "long", year: "numeric" })}
        action={
          <>
            <IconButton
              label="Anterior"
              variant="outline"
              onClick={() => step(-1)}
            >
              <ChevronLeft />
            </IconButton>
            <Button
              variant="outline"
              size="sm"
              onClick={() => push({ date: undefined })}
            >
              Hoy
            </Button>
            <IconButton
              label="Siguiente"
              variant="outline"
              onClick={() => step(1)}
            >
              <ChevronRight />
            </IconButton>
            <SegmentedControl
              legend="Rango"
              value={mode}
              onValueChange={(m) =>
                push({ mode: m === "week" ? "week" : undefined })
              }
              options={[
                { value: "month", label: "Mes" },
                { value: "week", label: "Semana" },
              ]}
            />
          </>
        }
      />
      <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "grid grid-cols-7",
          mode === "month"
            ? "auto-rows-[minmax(6rem,1fr)]"
            : "auto-rows-[minmax(16rem,1fr)]",
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
                "min-w-0 border-b border-r p-1",
                !inMonth && "bg-sidebar text-muted-foreground",
                over === d && "ring-2 ring-inset ring-primary",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs",
                  d === now && "bg-primary text-primary-foreground",
                )}
              >
                {parseDay(d).getDate()}
              </span>
              <ul className="mt-1 space-y-0.5">
                {eventsOn(d).map((e) => (
                  <li
                    key={e.id}
                    className="truncate rounded-sm bg-primary/15 px-1 text-xs"
                  >
                    {e.title}
                  </li>
                ))}
                {tasksOn(d).map((task) => (
                  <li key={task.key}>
                    <Button
                      variant="plain"
                      size="auto"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/task", task.key)
                      }
                      onClick={() => open(task)}
                      className="h-auto w-full justify-start gap-1 truncate rounded-sm border bg-background px-1 text-xs hover:border-primary"
                    >
                      <StatusDot status={task.status} />
                      <span className="truncate">{task.title}</span>
                    </Button>
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
