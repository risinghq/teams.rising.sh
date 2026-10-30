import { useState } from "react";
import type { Task } from "@shared/types";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUSES, type TaskStatus } from "@/lib/domain";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import { usePatchTask } from "./hooks";
import { TaskLink } from "./task-link";

export function Board({ tasks, today }: { tasks: Task[]; today: string }) {
  const patch = usePatchTask();
  const [over, setOver] = useState<TaskStatus | null>(null);
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
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
                patch.mutate({
                  key,
                  parentId: task.parent_id,
                  patch: { status },
                });
            }}
            className={cn(
              "flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-sidebar p-2 transition-shadow",
              over === status && "ring-2 ring-primary",
            )}
          >
            <h2 className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <StatusDot status={status} />
              <span className="font-semibold">{STATUS_LABEL[status]}</span>
              <span className="tabular-nums">{column.length}</span>
            </h2>
            {column.map((task) => (
              <TaskLink
                key={task.key}
                task={task}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/task", task.key)
                }
                className="flex flex-col gap-2 rounded-lg bg-surface p-3 text-sm shadow-card transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs text-muted-foreground">
                  {task.key}
                </span>
                <span>{task.title}</span>
                <span className="flex items-center justify-between">
                  <DueChip task={task} today={today} />
                  <PersonAvatar person={task.owner} size={20} />
                </span>
              </TaskLink>
            ))}
          </section>
        );
      })}
    </div>
  );
}
