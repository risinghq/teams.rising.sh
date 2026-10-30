import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TaskView } from "./task-view";

// A page with an optional side panel on wide screens. The panel opens from
// `?task=KEY`.
export function WithPanel({ children }: { children: ReactNode }) {
  const search = useSearch({ strict: false }) as { task?: string };
  const navigate = useNavigate();
  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      {search.task && (
        <aside className="hidden w-[420px] shrink-0 overflow-y-auto border-l md:block">
          <TaskView
            taskKey={search.task}
            onClose={() =>
              void navigate({
                to: ".",
                search: (p: Record<string, unknown>) => ({
                  ...p,
                  task: undefined,
                }),
              })
            }
          />
        </aside>
      )}
    </div>
  );
}
