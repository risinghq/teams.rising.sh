import { Lock } from "lucide-react";
import type { Task } from "@/api";
import { cn } from "@/lib/cn";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { Button } from "@/ui/button";
import { ProgressBar } from "@/ui/progress-bar";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import { LabelChip } from "./label-chip";

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
    <Button
      variant="plain"
      size="auto"
      onClick={() => onOpen(task)}
      className={cn(
        "w-full justify-start gap-3 rounded-none border-b px-4 py-2 text-sm hover:bg-muted/60",
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
      <PersonAvatar person={task.owner} />
    </Button>
  );
}
