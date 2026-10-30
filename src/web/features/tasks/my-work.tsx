import { today } from "@/lib/dates";
import { filterTasks } from "@/lib/tasks";
import { useSearchParams } from "@/hooks/use-search-params";
import { PageHeader } from "@/ui/page-header";
import { TaskFilters } from "./filter-bar";
import { useLabels, useTasks } from "./hooks";
import { parseMyWorkSearch } from "./search";
import { TaskResults } from "./task-results";
import { WithPanel } from "./with-panel";

export function MyWork() {
  const { search, push, replace } = useSearchParams(parseMyWorkSearch);
  const tasks = useTasks({ owner: "me", open: "1" });
  const labels = useLabels();
  const shown = tasks.data && filterTasks(tasks.data, search);
  return (
    <WithPanel>
      <PageHeader
        title="Mi trabajo"
        action={
          <TaskFilters
            search={search}
            onChange={push}
            onChangeText={replace}
            labels={labels.data}
          />
        }
      />
      <TaskResults
        tasks={shown}
        view={search.view ?? "list"}
        today={today()}
        selected={search.task}
        empty={
          tasks.data?.length === 0
            ? {
                title: "No tienes nada pendiente",
                hint: "Aquí aparecen tus tareas, agrupadas por fecha de entrega.",
              }
            : {
                title: "No hay tareas aquí",
                hint: "Quita los filtros para ver el resto.",
              }
        }
      />
    </WithPanel>
  );
}
