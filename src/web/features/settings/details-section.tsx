import { useState } from "react";
import { ImagePicker } from "@/features/files/image-picker";
import { TeamMark } from "@/features/teams/team-mark";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { usePatchTeam } from "./hooks";
import { Section } from "./section";

export function DetailsSection({
  team,
  name: initialName,
  imageUrl,
}: {
  team: string;
  name: string;
  imageUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const save = usePatchTeam();
  return (
    <Section title="Detalles">
      <div className="px-4 pt-2">
        <ImagePicker
          label="Imagen del equipo"
          value={imageUrl}
          disabled={save.isPending}
          onChange={(url) => save.mutate({ team, body: { image_url: url } })}
        >
          <TeamMark teamKey={team} size={48} />
        </ImagePicker>
      </div>
      <form
        className="flex flex-col gap-2 px-4 pt-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate({ team, body: { name: name.trim() } });
        }}
      >
        <Input
          aria-label="Nombre del equipo"
          autoComplete="off"
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
