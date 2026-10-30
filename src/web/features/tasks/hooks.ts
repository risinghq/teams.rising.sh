import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, type Task } from "@/api";
import { useWrite } from "@/hooks/use-write";
import { queryKeys } from "@/lib/query-keys";

export const useTasks = (query: Record<string, string>) =>
  useQuery({
    queryKey: queryKeys.tasks.list(query),
    queryFn: () => api.tasks(query),
  });
export const useTask = (key: string) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(key),
    queryFn: () => api.task(key),
  });
export const useLabels = () =>
  useQuery({
    queryKey: queryKeys.labels,
    queryFn: api.labels,
    staleTime: 60_000,
  });

// The labels a team can use: its own plus the shared ones.
export function useTeamLabels(teamId: string | undefined) {
  return useLabels().data?.filter(
    (l) => l.team_id === null || l.team_id === teamId,
  );
}

export const useCreateTask = () =>
  useWrite("createTask", (body: Record<string, unknown>) =>
    api.createTask(body),
  );
export const usePatchTask = () =>
  useWrite(
    "patchTask",
    ({
      key,
      patch,
    }: {
      key: string;
      parentId: string | null;
      patch: Record<string, unknown>;
    }) => api.patchTask(key, patch),
  );
export const useComment = () =>
  useWrite("comment", ({ key, body }: { key: string; body: string }) =>
    api.comment(key, body),
  );
export const useJoinTask = () =>
  useWrite("joinTask", ({ key }: { key: string }) => api.join(key));
export const useLeaveTask = () =>
  useWrite("leaveTask", ({ key }: { key: string }) => api.leave(key));

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
