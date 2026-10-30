import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMe } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { PageHeader } from "@/ui/page-header";
import { Textarea } from "@/ui/textarea";
import { useCreateTeam } from "./hooks";

// Admins create teams. The creator becomes the first leader and lands on the
// new team's settings to add people.
export function NewTeam() {
  const me = useMe().data;
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateTeam();
  if (me && !me.is_admin)
    return <EmptyState title="Solo un admin puede crear equipos" />;
  const valid = /^[A-Z][A-Z0-9]{1,5}$/.test(key) && name.trim() !== "";
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nuevo equipo" />
      <form
        className="flex flex-col gap-3 px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || !me) return;
          create.mutate(
            { key, name: name.trim(), description, leaders: [me.id] },
            {
              onSuccess: () =>
                void navigate({
                  to: "/t/$team/settings",
                  params: { team: key },
                }),
            },
          );
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="team-name">Nombre</Label>
          <Input
            id="team-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AI for Science"
          />
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <Label htmlFor="team-key">Clave</Label>
          <Input
            id="team-key"
            aria-describedby="team-key-hint"
            value={key}
            onChange={(e) =>
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            maxLength={6}
            placeholder="AIS"
            className="w-28 uppercase"
          />
          <p id="team-key-hint" className="text-muted-foreground">
            {`De 2 a 6 letras o números. Numera las tareas, como en ${key || "AIS"}-12, y las ramas la usan para enlazarse a una tarea.`}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="team-description">Descripción</Label>
          <Textarea
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!valid || create.isPending}>
            Crear equipo
          </Button>
        </div>
      </form>
    </div>
  );
}
