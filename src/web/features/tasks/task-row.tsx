import { Lock } from "lucide-react";
import type { Task } from "@shared/types";
import { cn } from "@/lib/cn";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { ProgressBar } from "@/ui/progress-bar";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import { LabelChip } from "./label-chip";
import { TaskLink } from "./task-link";

export function TaskRow({
  task,
  today,
  selected,
}: {
  task: Task;
  today: string;
  selected?: boolean;
}) {
  return (
    <TaskLink
      task={task}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-muted/60",
      )}
    >
      <StatusDot status={task.status} />
      <span className="hidden w-16 shrink-0 text-xs text-muted-foreground sm:block">
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
      <span className="hidden gap-1 md:flex">
        {task.labels.map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
      </span>
      <DueChip task={task} today={today} />
      <PersonAvatar person={task.owner} />
    </TaskLink>
  );
}
