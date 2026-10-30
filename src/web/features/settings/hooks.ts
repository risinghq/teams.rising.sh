import type { Member } from "@shared/types";
import { api } from "@/api";
import { useWrite } from "@/hooks/use-write";
import { memberRemoved, memberRole, teamPatch } from "@/lib/optimistic";

export const useCreateTeam = () =>
  useWrite(
    "createTeam",
    (body: Record<string, unknown>) => api.createTeam(body),
    {
      inline: true,
    },
  );

export const usePatchTeam = () =>
  useWrite(
    "patchTeam",
    ({ team, body }: { team: string; body: Record<string, unknown> }) =>
      api.patchTeam(team, body),
    { optimistic: teamPatch },
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
    { optimistic: memberRole },
  );

export const useRemoveMember = () =>
  useWrite(
    "removeMember",
    ({ team, userId }: { team: string; userId: string }) =>
      api.removeMember(team, userId),
    { optimistic: memberRemoved },
  );

export const useCreateLabel = () =>
  useWrite(
    "createLabel",
    (body: Record<string, unknown>) => api.createLabel(body),
    {
      inline: true,
    },
  );
