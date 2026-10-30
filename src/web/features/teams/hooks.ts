import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/lib/query-keys";

export const useMe = () =>
  useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: 60_000 });
export const useTeams = () =>
  useQuery({ queryKey: queryKeys.teams.list, queryFn: api.teams });
export const useTeam = (key: string) =>
  useQuery({
    queryKey: queryKeys.teams.detail(key),
    queryFn: () => api.team(key),
  });
export const useUsers = () =>
  useQuery({
    queryKey: queryKeys.users,
    queryFn: api.users,
    staleTime: 60_000,
  });

// A user's name by id, for updates that store only ids.
export function useNameOf(): (userId: string) => string {
  const users = useUsers().data;
  return (userId) => users?.find((u) => u.id === userId)?.name ?? "alguien";
}

// What the signed-in person may do in a team. Admins lead every team.
export function useTeamRole(team: string) {
  const me = useMe().data;
  return me?.is_admin ? "leader" : me?.teams.find((x) => x.key === team)?.role;
}
