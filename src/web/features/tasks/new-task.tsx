import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { useCreateTask } from "./hooks";

export function NewTask({ team, project }: { team: string; project?: string }) {
  const [title, setTitle] = useState("");
  const create = useCreateTask();
  return (
    <form
      className="flex items-center gap-2 border-b px-4 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = title.trim();
        if (!value) return;
        create.mutate(
          { team, title: value, project_id: project },
          { onSuccess: () => setTitle("") },
        );
      }}
    >
      <Plus size={16} aria-hidden className="shrink-0 text-muted-foreground" />
      <Input
        aria-label="Título de la nueva tarea"
        appearance="bare"
        size="sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Escribe una tarea y pulsa Enter"
        className="min-w-0 flex-1"
      />
      {title.trim() && (
        <Button type="submit" disabled={create.isPending}>
          Agregar
        </Button>
      )}
    </form>
  );
}
