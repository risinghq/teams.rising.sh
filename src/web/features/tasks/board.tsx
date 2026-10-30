import { useState } from "react";
import type { Task } from "@/api";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUSES, type TaskStatus } from "@/lib/domain";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { Button } from "@/ui/button";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import { usePatchTask } from "./hooks";

export function Board({
  tasks,
  today,
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
                patch.mutate({
                  key,
                  parentId: task.parent_id,
                  patch: { status },
                });
            }}
            className={cn(
              "flex w-64 shrink-0 flex-col gap-2 rounded-lg bg-sidebar p-2",
              over === status && "ring-2 ring-primary",
            )}
          >
            <h2 className="flex items-center gap-2 px-1 text-xs font-medium">
              <StatusDot status={status} /> {STATUS_LABEL[status]}
              <span className="text-muted-foreground">{column.length}</span>
            </h2>
            {column.map((task) => (
              <Button
                key={task.key}
                variant="plain"
                size="auto"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/task", task.key)
                }
                onClick={() => onOpen(task)}
                className="flex-col items-stretch justify-start gap-2 whitespace-normal rounded-md border bg-background p-2 hover:border-primary"
              >
                <span className="text-xs text-muted-foreground">
                  {task.key}
                </span>
                <span>{task.title}</span>
                <span className="flex items-center justify-between">
                  <DueChip task={task} today={today} />
                  <PersonAvatar person={task.owner} size={18} />
                </span>
              </Button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
