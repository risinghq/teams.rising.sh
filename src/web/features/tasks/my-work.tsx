import { Link } from "@tanstack/react-router";
import { today } from "@/lib/dates";
import { buttonVariants } from "@/ui/button";
import { taskQuery } from "@/lib/tasks";
import { useSearchParams } from "@/hooks/use-search-params";
import { useMe } from "@/features/teams/hooks";
import { Page } from "@/ui/page-header";
import { TaskFilters } from "./filter-bar";
import { useLabels, useTaskPages } from "./hooks";
import { QuickCreate } from "./quick-create";
import { parseMyWorkSearch } from "./search";
import { Shortcuts } from "./shortcuts";
import { TaskResults } from "./task-results";
import { WithPanel } from "./with-panel";

const greeting = (hour: number) =>
  hour < 6
    ? "Buenas noches"
    : hour < 13
      ? "Buenos días"
      : hour < 20
        ? "Buenas tardes"
        : "Buenas noches";

export function MyWork() {
  const { search, push, replace } = useSearchParams(parseMyWorkSearch);
  const me = useMe().data;
  const day = today();
  const pages = useTaskPages(
    taskQuery({ owner: "me", open: "1" }, search, day),
  );
  const labels = useLabels();
  const first = me?.name.split(" ")[0];
  const filtered = Object.keys(search).some(
    (k) => k !== "view" && k !== "task",
  );

  return (
    <WithPanel>
      <Page>
        <header className="flex flex-col gap-8 pt-12 pb-8 sm:pt-16">
          <h1 className="text-display font-semibold tracking-tight sm:text-[2.5rem]">
            {greeting(new Date().getHours())}
            {first ? `, ${first}` : ""}
          </h1>
          <QuickCreate />
          <Shortcuts today={day} />
        </header>
        <section aria-labelledby="my-work">
          <div className="flex flex-col gap-4 pb-2">
            <h2 id="my-work" className="text-xl font-semibold">
              Mi trabajo
            </h2>
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
              <TaskFilters
                search={search}
                onChange={push}
                onChangeText={replace}
                labels={labels.data}
              />
            </div>
          </div>
          <TaskResults
            pages={pages}
            view={search.view ?? "list"}
            today={day}
            selected={search.task}
            empty={
              filtered
                ? {
                    title: "No hay tareas con estos filtros",
                    hint: "Quita un filtro para ver el resto de tu trabajo.",
                    action: (
                      <Link
                        to="/"
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Quitar filtros
                      </Link>
                    ),
                  }
                : {
                    title: "No tienes nada pendiente",
                    hint: "Escribe una tarea arriba y aparecerá aquí, ordenada por fecha de entrega.",
                    action: me?.teams[0] && (
                      <Link
                        to="/t/$team"
                        params={{ team: me.teams[0].key }}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Abrir {me.teams[0].name}
                      </Link>
                    ),
                  }
            }
          />
        </section>
      </Page>
    </WithPanel>
  );
}
