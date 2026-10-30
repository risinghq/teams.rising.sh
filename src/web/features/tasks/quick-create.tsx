import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/features/teams/hooks";
import { Input } from "@/ui/input";
import { Select } from "@/ui/select";
import { useCreateTask } from "./hooks";

export function QuickCreate() {
  const teams = useMe().data?.teams ?? [];
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string>();
  const create = useCreateTask();
  const navigate = useNavigate();
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
              toast.success(`${task.key} creada`, {
                action: {
                  label: "Abrir",
                  onClick: () =>
                    void navigate({
                      to: "/t/$team/$number",
                      params: { team: task.team, number: String(task.number) },
                    }),
                },
              });
            },
          },
        );
      }}
    >
      <div className="flex items-end gap-3">
        <Input
          aria-label="Título de la nueva tarea"
          aria-describedby={hint}
          appearance="underline"
          disabled={disabled}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué quieres hacer hoy?"
          className="h-12 min-w-0 flex-1 text-xl placeholder:text-muted-foreground/70 md:text-xl"
        />
        {teams.length > 1 && (
          <Select
            aria-label="Equipo de la nueva tarea"
            appearance="underline"
            className="h-12 w-auto max-w-40 shrink-0"
            value={team}
            onChange={(e) => setPicked(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <p id={hint} className="text-xs text-muted-foreground">
        {teams.length === 0 && me
          ? "Únete a un equipo para crear tareas."
          : "Pulsa Enter para crearla. Queda asignada a ti."}
      </p>
    </form>
  );
}
