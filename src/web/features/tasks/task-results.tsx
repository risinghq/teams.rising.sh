import { groupByDue } from "@/lib/tasks";
import { EmptyState } from "@/ui/empty-state";
import { GroupHeading } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { Board } from "./board";
import type { TaskPages } from "./hooks";
import { LoadMore } from "./load-more";
import { TaskRow } from "./task-row";

export function TaskResults({
  pages,
  view,
  today,
  selected,
  empty,
}: {
  pages: TaskPages;
  view: "list" | "board";
  today: string;
  selected?: string;
  empty: { title: string; hint: string; action?: React.ReactNode };
}) {
  const { tasks, hasMore, isError } = pages;
  if (isError)
    return (
      <EmptyState title="No se pudieron cargar las tareas">
        Revisa tu conexión y recarga la página.
      </EmptyState>
    );
  if (!tasks) return <SkeletonRows />;
  if (tasks.length === 0)
    return (
      <EmptyState title={empty.title} action={empty.action}>
        {empty.hint}
      </EmptyState>
    );
  return (
    <>
      {view === "board" ? (
        <Board tasks={tasks} today={today} />
      ) : (
        groupByDue(tasks, today).map((g) => (
          <section key={g.id}>
            <GroupHeading
              count={hasMore ? undefined : g.items.length}
              tone={g.id === "overdue" ? "destructive" : undefined}
            >
              {g.label}
            </GroupHeading>
            {g.items.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                today={today}
                selected={selected === task.key}
              />
            ))}
          </section>
        ))
      )}
      <LoadMore pages={pages} />
    </>
  );
}
