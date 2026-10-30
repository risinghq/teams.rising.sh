import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { today } from "@/lib/dates";
import { taskQuery } from "@/lib/tasks";
import { useSearchParams } from "@/hooks/use-search-params";
import { ProjectHeader } from "@/features/projects/project-header";
import { ProjectList } from "@/features/projects/project-list";
import { useProjects } from "@/features/projects/hooks";
import { TaskFilters } from "@/features/tasks/filter-bar";
import { useTaskPages, useTeamLabels } from "@/features/tasks/hooks";
import { NewTask } from "@/features/tasks/new-task";
import { parseTeamSearch } from "@/features/tasks/search";
import { TaskResults } from "@/features/tasks/task-results";
import { WithPanel } from "@/features/tasks/with-panel";
import { Button } from "@/ui/button";
import { Page, PageHeader } from "@/ui/page-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { useTeamRole, useTeams, useUsers } from "./hooks";
import { TeamMark } from "./team-mark";

export function TeamPage({ team }: { team: string }) {
  const { search, push, replace } = useSearchParams(parseTeamSearch);
  const day = today();
  const pages = useTaskPages(taskQuery({ team, top: "1" }, search, day));
  const users = useUsers();
  const projects = useProjects(team);
  const teamRow = useTeams().data?.find((x) => x.key === team);
  const labels = useTeamLabels(teamRow?.id);
  const role = useTeamRole(team);
  const current = projects.data?.find((p) => p.id === search.project);

  return (
    <WithPanel>
      <Page>
        <PageHeader
          title={teamRow?.name ?? team}
          icon={<TeamMark teamKey={team} size={32} />}
          action={
            role === "leader" && (
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
            )
          }
          controls={
            <TaskFilters
              search={search}
              onChange={push}
              onChangeText={replace}
              labels={labels}
              owners={users.data}
              projects={projects.data}
            />
          }
        />
        {current ? (
          <ProjectHeader
            team={team}
            project={current}
            canEdit={role === "leader"}
          />
        ) : (
          !search.project && (
            <ProjectList
              team={team}
              projects={projects.data ?? []}
              canCreate={role !== undefined}
            />
          )
        )}
        <NewTask team={team} project={current?.id} />
        <TaskResults
          pages={pages}
          view={search.view ?? "list"}
          today={day}
          selected={search.task}
          empty={{
            title: "No hay tareas aquí",
            hint: "Escribe una arriba o quita los filtros.",
          }}
        />
      </Page>
    </WithPanel>
  );
}
