import { X } from "lucide-react";
import type { TaskDetail } from "@shared/types";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useMe, useUsers } from "@/features/teams/hooks";
import { Select } from "@/ui/select";
import { useAddCollaborator, useRemoveCollaborator } from "./hooks";

// The people helping the owner: removable chips and a select that adds anyone
// else. The API refuses to add someone else when the caller cannot edit the
// task, and the failure shows as a toast.
export function TaskCollaborators({ task }: { task: TaskDetail }) {
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
          <button
            type="button"
            aria-label={`Quitar a ${c.name}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => remove.mutate({ key: task.key, userId: c.id })}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {candidates.length > 0 && (
        <Select
          aria-label="Agregar colaborador"
          size="sm"
          className="w-auto"
          value=""
          onChange={(e) =>
            add.mutate({ key: task.key, userId: e.target.value })
          }
        >
          <option value="" disabled>
            Agregar…
          </option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.id === me?.id ? `${u.name} (tú)` : u.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
