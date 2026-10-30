import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { today } from "@/lib/dates";
import { filterTasks, summarizeProjects } from "@/lib/tasks";
import { useSearchParams } from "@/hooks/use-search-params";
import { ProjectHeader } from "@/features/projects/project-header";
import { ProjectList } from "@/features/projects/project-list";
import { useProjects } from "@/features/projects/hooks";
import { TaskFilters } from "@/features/tasks/filter-bar";
import { useTeamLabels, useTasks } from "@/features/tasks/hooks";
import { NewTask } from "@/features/tasks/new-task";
import { parseTeamSearch } from "@/features/tasks/search";
import { TaskResults } from "@/features/tasks/task-results";
import { WithPanel } from "@/features/tasks/with-panel";
import { Button } from "@/ui/button";
import { PageHeader } from "@/ui/page-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { useTeamRole, useTeams, useUsers } from "./hooks";
import { TeamMark } from "./team-mark";

export function TeamPage({ team }: { team: string }) {
  const { search, push, replace } = useSearchParams(parseTeamSearch);
  const tasks = useTasks({ team, top: "1" });
  const users = useUsers();
  const projects = useProjects(team);
  const teamRow = useTeams().data?.find((x) => x.key === team);
  const labels = useTeamLabels(teamRow?.id);
  const role = useTeamRole(team);
  const shown = tasks.data && filterTasks(tasks.data, search);
  const current = projects.data?.find((p) => p.id === search.project);
  const pick = (project: string | undefined) => push({ project });

  return (
    <WithPanel>
      <PageHeader
        title={teamRow?.name ?? team}
        icon={<TeamMark teamKey={team} size={28} />}
        description={teamRow?.description}
        action={
          <>
            <TaskFilters
              search={search}
              onChange={push}
              onChangeText={replace}
              labels={labels}
              owners={users.data}
              projects={projects.data}
            />
            {role === "leader" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    aria-label="Ajustes del equipo"
                  >
                    <Link to="/t/$team/settings" params={{ team }}>
                      <Settings />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ajustes del equipo</TooltipContent>
              </Tooltip>
            )}
          </>
        }
      />
      {current || search.project === "none" ? (
        <ProjectHeader
          team={team}
          project={current ?? null}
          canEdit={role === "leader"}
          onBack={() => pick(undefined)}
        />
      ) : (
        !search.project && (
          <ProjectList
            team={team}
            summary={summarizeProjects(projects.data ?? [], tasks.data ?? [])}
            canCreate={role !== undefined}
            onPick={pick}
          />
        )
      )}
      <NewTask team={team} project={current?.id} />
      <TaskResults
        tasks={shown}
        view={search.view ?? "list"}
        today={today()}
        selected={search.task}
        empty={{
          title: "No hay tareas aquí",
          hint: "Agrega una arriba o quita los filtros.",
        }}
      />
    </WithPanel>
  );
}
