import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, type Task } from "./api";
import { iso } from "./lib";

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 60_000 });
export const useTeams = () =>
  useQuery({ queryKey: ["teams"], queryFn: api.teams });
export const useUsers = () =>
  useQuery({ queryKey: ["users"], queryFn: api.users, staleTime: 60_000 });
export const useLabels = () =>
  useQuery({ queryKey: ["labels"], queryFn: api.labels, staleTime: 60_000 });
export const useProjects = (team: string) =>
  useQuery({ queryKey: ["projects", team], queryFn: () => api.projects(team) });
export const useTasks = (query: Record<string, string>) =>
  useQuery({ queryKey: ["tasks", query], queryFn: () => api.tasks(query) });
export const useTask = (key: string) =>
  useQuery({ queryKey: ["task", key], queryFn: () => api.task(key) });
export const useInbox = () =>
  useQuery({
    queryKey: ["inbox"],
    queryFn: api.inbox,
    refetchInterval: 60_000,
  });

export const today = () => iso(new Date());

// Every write refetches every query. The data set is small and one rule keeps
// lists, boards, the calendar and the detail view consistent.
export function useWrite<A, R = unknown>(fn: (arg: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const usePatchTask = () =>
  useWrite(({ key, patch }: { key: string; patch: Record<string, unknown> }) =>
    api.patchTask(key, patch),
  );

const wide = () => window.matchMedia("(min-width: 768px)").matches;

// A wide screen opens the side panel through the `task` search parameter. A
// narrow one opens the full page.
export function useOpenTask() {
  const navigate = useNavigate();
  return (task: Pick<Task, "key" | "team" | "number">) => {
    if (wide()) {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          task: task.key,
        }),
      });
    } else {
      void navigate({
        to: "/t/$team/$number",
        params: { team: task.team, number: String(task.number) },
      });
    }
  };
}
