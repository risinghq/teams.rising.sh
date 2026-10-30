import { useNavigate } from "@tanstack/react-router";
import { useEffect, useEffectEvent } from "react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/dates";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { PageHeader } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { useInbox, useReadInbox } from "./hooks";

export function InboxPage() {
  const q = useInbox();
  const read = useReadInbox();
  const navigate = useNavigate();
  const unread = q.data?.unread ?? 0;
  const markRead = useEffectEvent(() => read.mutate());
  // Opening the inbox reads it.
  useEffect(() => {
    if (unread > 0) markRead();
  }, [unread]);
  return (
    <div>
      <PageHeader title="Bandeja" />
      {q.isPending ? (
        <SkeletonRows />
      ) : q.data?.items.length === 0 ? (
        <EmptyState title="Estás al día">
          Aquí llegan las menciones y los cambios en las tareas que sigues.
        </EmptyState>
      ) : (
        <ul>
          {q.data?.items.map((i) => (
            <li key={i.id}>
              <Button
                variant="plain"
                size="auto"
                onClick={() => {
                  const [team, number] = i.task_key.split("-");
                  void navigate({
                    to: "/t/$team/$number",
                    params: { team: team ?? "", number: number ?? "" },
                  });
                }}
                className="w-full items-start justify-start gap-3 whitespace-normal rounded-none border-b px-4 py-3 hover:bg-muted/60"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    i.unread ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {i.task_key} · {i.author_name ?? "Sistema"} ·{" "}
                    {relativeTime(i.created_at)}
                  </span>
                  <span className="block truncate">{i.task_title}</span>
                  {i.body && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {i.body}
                    </span>
                  )}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
