import { useState } from "react";
import type { Member } from "@shared/types";
import { ROLE_LABEL } from "@/lib/domain";
import { useUsers } from "@/features/teams/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { Button } from "@/ui/button";
import { Select } from "@/ui/select";
import { useRemoveMember, useSetMember } from "./hooks";
import { Section } from "./section";

export function MembersSection({
  team,
  members,
}: {
  team: string;
  members: Member[];
}) {
  const users = useUsers();
  const [adding, setAdding] = useState("");
  const set = useSetMember();
  const remove = useRemoveMember();
  const outside = users.data?.filter(
    (u) => u.kind === "human" && !members.some((m) => m.id === u.id),
  );
  return (
    <Section title={`Miembros ${members.length}`}>
      <ul>
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
          >
            <PersonAvatar person={m} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{m.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {m.email}
              </span>
            </span>
            <Select
              aria-label={`Rol de ${m.name}`}
              size="sm"
              className="w-auto"
              value={m.role}
              onChange={(e) =>
                set.mutate({
                  team,
                  userId: m.id,
                  role: e.target.value as Member["role"],
                })
              }
            >
              {(Object.keys(ROLE_LABEL) as Member["role"][]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => remove.mutate({ team, userId: m.id })}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding) return;
          set.mutate(
            { team, userId: adding, role: "member" },
            { onSuccess: () => setAdding("") },
          );
        }}
      >
        <Select
          aria-label="Persona a agregar"
          className="min-w-0 flex-1"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        >
          <option value="">Agregar a una persona…</option>
          {outside?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variant="outline"
          disabled={!adding || set.isPending}
        >
          Agregar
        </Button>
      </form>
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        Las personas aparecen aquí después de iniciar sesión por primera vez.
      </p>
    </Section>
  );
}
