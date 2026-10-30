import { api, type Member } from "@/api";
import { useWrite } from "@/hooks/use-write";

export const useCreateTeam = () =>
  useWrite("createTeam", (body: Record<string, unknown>) =>
    api.createTeam(body),
  );

export const usePatchTeam = () =>
  useWrite(
    "patchTeam",
    ({ team, body }: { team: string; body: Record<string, unknown> }) =>
      api.patchTeam(team, body),
  );

export const useSetMember = () =>
  useWrite(
    "setMember",
    ({
      team,
      userId,
      role,
    }: {
      team: string;
      userId: string;
      role: Member["role"];
    }) => api.setMember(team, userId, role),
  );

export const useRemoveMember = () =>
  useWrite(
    "removeMember",
    ({ team, userId }: { team: string; userId: string }) =>
      api.removeMember(team, userId),
  );

export const useCreateLabel = () =>
  useWrite("createLabel", (body: Record<string, unknown>) =>
    api.createLabel(body),
  );
