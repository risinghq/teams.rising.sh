import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { usePatchTeam } from "./hooks";
import { Section } from "./section";

export function DetailsSection({
  team,
  name: initialName,
  description: initialDescription,
}: {
  team: string;
  name: string;
  description: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const save = usePatchTeam();
  const changed = name !== initialName || description !== initialDescription;
  return (
    <Section title="Detalles">
      <form
        className="flex flex-col gap-2 px-4 pt-2 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim())
            save.mutate({ team, body: { name: name.trim(), description } });
        }}
      >
        <Input
          aria-label="Nombre del equipo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          aria-label="Descripción del equipo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="En qué trabaja el equipo"
          rows={2}
        />
        {changed && (
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              Guardar
            </Button>
          </div>
        )}
      </form>
    </Section>
  );
}
