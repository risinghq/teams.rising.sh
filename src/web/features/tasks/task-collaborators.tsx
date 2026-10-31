import { Plus, X } from "lucide-react";
import type { TaskDetail } from "@shared/types";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useMe, useUsers } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { useAddCollaborator, useRemoveCollaborator } from "./hooks";

// The people helping the owner: removable chips and a menu that adds people.
// Someone who cannot edit the task may still join an open one and leave, so
// for them the menu offers only themselves and only their own chip has an x.
export function TaskCollaborators({
  task,
  canEdit,
}: {
  task: TaskDetail;
  canEdit: boolean;
}) {
  const me = useMe().data;
  const users = useUsers().data ?? [];
  const add = useAddCollaborator();
  const remove = useRemoveCollaborator();
  const taken = new Set([
    task.owner?.id,
    ...task.collaborators.map((c) => c.id),
  ]);
  // The caller first, so joining stays one pick.
  const candidates = users
    .filter((u) => !taken.has(u.id))
    .filter((u) =>
      canEdit ? true : u.id === me?.id && task.visibility === "open",
    )
    .sort((a, b) => Number(b.id === me?.id) - Number(a.id === me?.id));
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {task.collaborators.map((c) => (
        <span
          key={c.id}
          className="flex h-7 items-center gap-1.5 rounded-full border pr-1 pl-1"
        >
          <PersonAvatar person={c} size={18} />
          {c.id === me?.id ? "Tú" : c.name}
          {(canEdit || c.id === me?.id) && (
            <button
              type="button"
              aria-label={`Quitar a ${c.name}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => remove.mutate({ key: task.key, userId: c.id })}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}
      {candidates.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Agregar colaborador"
              className="-ml-2 px-2 font-normal text-muted-foreground"
            >
              <Plus /> Agregar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            {candidates.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onSelect={() => add.mutate({ key: task.key, userId: u.id })}
              >
                <PersonAvatar person={u} size={18} />
                {u.id === me?.id ? `${u.name} (tú)` : u.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
