import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { useCreateTask } from "./hooks";

// A one-line form that creates a task in a team, inside a project when one is
// given. With `parent` it creates a subtask of that task instead.
export function NewTask({
  team,
  project,
  parent,
  className,
}: {
  team: string;
  project?: string | null;
  parent?: string;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const create = useCreateTask();
  return (
    <form
      // The row is the field: its edge and halo follow the input inside, so
      // focus draws one box around the icon and the text.
      className={cn(
        "mb-2 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-transparent px-3 py-1 transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-input focus-within:border-primary focus-within:bg-surface focus-within:ring-3 focus-within:ring-primary/20",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const value = title.trim();
        if (!value) return;
        create.mutate(
          { team, title: value, project_id: project ?? undefined, parent },
          { onSuccess: () => setTitle("") },
        );
      }}
    >
      <Plus size={16} aria-hidden className="shrink-0 text-muted-foreground" />
      <Input
        aria-label={
          parent ? "Título de la nueva subtarea" : "Título de la nueva tarea"
        }
        appearance="bare"
        size="sm"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={
          parent
            ? "Agrega una subtarea y pulsa Enter"
            : "Escribe una tarea y pulsa Enter"
        }
        className="min-w-0 flex-1 px-0"
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
