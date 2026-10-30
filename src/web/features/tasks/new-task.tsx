import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { useCreateTask } from "./hooks";

export function NewTask({ team, project }: { team: string; project?: string }) {
  const [title, setTitle] = useState("");
  const create = useCreateTask();
  return (
    <form
      className="mb-2 flex flex-wrap items-center gap-2 rounded-lg px-3 py-1 focus-within:bg-muted/30"
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
        className="min-w-0 flex-1 px-0 focus-visible:ring-0"
      />
      {title.trim() && (
        <Button type="submit" size="sm" disabled={create.isPending}>
          Agregar
        </Button>
      )}
      <FormError error={create.error} className="basis-full pl-6" />
    </form>
  );
}
