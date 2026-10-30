import type { Task } from "@/api";
import { cn } from "@/lib/cn";
import { day, parseDay } from "@/lib/dates";
import { isOpen } from "@/lib/tasks";

export function DueChip({ task, today }: { task: Task; today: string }) {
  if (!task.due_date) return null;
  const late = task.due_date < today && isOpen(task.status);
  const label = day(parseDay(task.due_date), {
    month: "short",
    day: "numeric",
  });
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        late ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
