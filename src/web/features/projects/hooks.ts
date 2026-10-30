import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useWrite } from "@/hooks/use-write";
import { projectPatch } from "@/lib/optimistic";
import { queryKeys } from "@/lib/query-keys";

export const useProjects = (team: string) =>
  useQuery({
    queryKey: queryKeys.projects.ofTeam(team),
    queryFn: () => api.projects(team),
  });

export const useCreateProject = () =>
  useWrite(
    "createProject",
    ({ team, body }: { team: string; body: Record<string, unknown> }) =>
      api.createProject(team, body),
    { inline: true },
  );

export const usePatchProject = () =>
  useWrite(
    "patchProject",
    ({
      id,
      body,
    }: {
      team: string;
      id: string;
      body: Record<string, unknown>;
    }) => api.patchProject(id, body),
    { optimistic: projectPatch },
  );
