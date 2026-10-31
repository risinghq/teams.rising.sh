import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { Task } from "@shared/types";
import { useMe } from "@/features/teams/hooks";
import { TeamMark } from "@/features/teams/team-mark";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { FieldMenu } from "./field-menu";
import { useCreateTask } from "./hooks";

export function QuickCreate() {
  const teams = useMe().data?.teams ?? [];
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string>();
  const [created, setCreated] = useState<Task>();
  const create = useCreateTask();
  const hint = useId();
  const me = useMe().data;
  const team = picked ?? teams[0]?.key;
  const disabled = !me || !team;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = title.trim();
        if (!value || !team || !me) return;
        create.mutate(
          { team, title: value, owner_id: me.id },
          {
            onSuccess: (task) => {
              setTitle("");
              setCreated(task);
            },
          },
        );
      }}
    >
      <div className="flex items-end gap-3 border-b border-input transition-colors duration-150 ease-out hover:border-foreground/60 focus-within:border-primary">
        <Input
          aria-label="Título de la nueva tarea"
          aria-describedby={hint}
          appearance="bare"
          autoComplete="off"
          disabled={disabled}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué quieres hacer hoy?"
          className="h-12 min-w-0 flex-1 px-0 text-xl placeholder:text-muted-foreground/70 md:text-xl"
        />
        {teams.length > 1 && team && (
          <FieldMenu
            label="Equipo de la nueva tarea"
            value={team}
            onChange={setPicked}
            chevron="always"
            align="end"
            className="mb-2 ml-0 max-w-44 shrink-0 text-muted-foreground"
            options={teams.map((t) => ({
              value: t.key,
              label: t.name,
              lead: <TeamMark teamKey={t.key} size={16} />,
            }))}
          />
        )}
      </div>
      {/* The last task created takes the hint's place until the next one, so
          a slow reader still finds the link and nothing below moves. */}
      <p id={hint} aria-live="polite" className="text-xs text-muted-foreground">
        {created ? (
          <>
            <span className="text-foreground">{created.key} creada</span> ·{" "}
            <Link
              to="/t/$team/$number"
              params={{ team: created.team, number: String(created.number) }}
              className="text-foreground underline underline-offset-2"
            >
              Abrir
            </Link>
          </>
        ) : teams.length === 0 && me ? (
          "Únete a un equipo para crear tareas."
        ) : (
          "Pulsa Enter para crearla. Queda asignada a ti."
        )}
      </p>
      <FormError error={create.error} />
    </form>
  );
}
