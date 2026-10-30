import type { Task } from "@/api";
import { groupByDue } from "@/lib/tasks";
import { EmptyState } from "@/ui/empty-state";
import { GroupHeading } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { Board } from "./board";
import { useOpenTask } from "./hooks";
import { TaskRow } from "./task-row";

export function TaskResults({
  tasks,
  view,
  today,
  selected,
  empty,
}: {
  tasks: Task[] | undefined;
  view: "list" | "board";
  today: string;
  selected?: string;
  empty: { title: string; hint: string };
}) {
  const open = useOpenTask();
  if (!tasks) return <SkeletonRows />;
  if (tasks.length === 0)
    return <EmptyState title={empty.title}>{empty.hint}</EmptyState>;
  if (view === "board")
    return <Board tasks={tasks} today={today} onOpen={open} />;
  return groupByDue(tasks, today).map((g) => (
    <section key={g.id}>
      <GroupHeading
        count={g.items.length}
        tone={g.id === "overdue" ? "destructive" : undefined}
      >
        {g.label}
      </GroupHeading>
      {g.items.map((task) => (
        <TaskRow
          key={task.key}
          task={task}
          today={today}
          onOpen={open}
          selected={selected === task.key}
        />
      ))}
    </section>
  ));
}
