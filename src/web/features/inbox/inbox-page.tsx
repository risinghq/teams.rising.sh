import { Link } from "@tanstack/react-router";
import { useEffect, useEffectEvent } from "react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/dates";
import { buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Page, PageHeader } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { useInbox, useReadInbox } from "./hooks";

export function InboxPage() {
  const q = useInbox();
  const read = useReadInbox();
  const unread = q.data?.unread ?? 0;
  const markRead = useEffectEvent(() => read.mutate());
  // Opening the inbox reads it.
  useEffect(() => {
    if (unread > 0) markRead();
  }, [unread]);
  return (
    <Page>
      <PageHeader title="Bandeja" />
      {q.isPending ? (
        <SkeletonRows />
      ) : q.data?.items.length === 0 ? (
        <EmptyState
          title="Estás al día"
          action={
            <Link to="/" className={buttonVariants({ variant: "outline" })}>
              Ir a Mi trabajo
            </Link>
          }
        >
          Aquí llegan las menciones y los cambios en las tareas que sigues.
        </EmptyState>
      ) : (
        <ul>
          {q.data?.items.map((i) => {
            const [team = "", number = ""] = i.task_key.split("-");
            return (
              <li key={i.id}>
                <Link
                  to="/t/$team/$number"
                  params={{ team, number }}
                  className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      i.unread ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">
                      {i.task_key} · {i.author_name ?? "Sistema"} ·{" "}
                      {relativeTime(i.created_at)}
                    </span>
                    <span className="block truncate text-sm">
                      {i.task_title}
                    </span>
                    {i.body && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {i.body}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
