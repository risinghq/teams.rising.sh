import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { usePatchTeam } from "./hooks";
import { Section } from "./section";

export function DetailsSection({
  team,
  name: initialName,
}: {
  team: string;
  name: string;
}) {
  const [name, setName] = useState(initialName);
  const save = usePatchTeam();
  return (
    <Section title="Detalles">
      <form
        className="flex flex-col gap-2 px-4 pt-2 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate({ team, body: { name: name.trim() } });
        }}
      >
        <Input
          aria-label="Nombre del equipo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {name !== initialName && (
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
