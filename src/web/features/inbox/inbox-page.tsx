import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/dates";
import { describeUpdate, groupInbox, type InboxThread } from "@/lib/updates";
import { useMe, useNameOf } from "@/features/teams/hooks";
import { Badge } from "@/ui/badge";
import { Button, buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Page, PageHeader } from "@/ui/page-header";
import { SegmentedControl } from "@/ui/segmented-control";
import { SkeletonRows } from "@/ui/skeleton";
import { useInbox, useReadInbox } from "./hooks";

type Show = "all" | "unread";

export function InboxPage() {
  const q = useInbox();
  const read = useReadInbox();
  const [show, setShow] = useState<Show>("all");
  const unread = q.data?.unread ?? 0;
  const threads = groupInbox(q.data?.items ?? []).filter(
    (t) => show === "all" || t.unread > 0,
  );
  return (
    <Page>
      <PageHeader
        title="Bandeja"
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0 || read.isPending}
            onClick={() => read.mutate()}
          >
            Marcar todo como leído
          </Button>
        }
        controls={
          <SegmentedControl
            legend="Mostrar"
            className="self-start"
            value={show}
            onValueChange={setShow}
            options={[
              { value: "all", label: "Todo" },
              {
                value: "unread",
                label: unread > 0 ? `Sin leer (${unread})` : "Sin leer",
              },
            ]}
          />
        }
      />
      {q.isPending ? (
        <SkeletonRows />
      ) : threads.length === 0 ? (
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
          {threads.map((t) => (
            <ThreadRow key={t.task_key} thread={t} />
          ))}
        </ul>
      )}
    </Page>
  );
}

function ThreadRow({ thread: t }: { thread: InboxThread }) {
  const nameOf = useNameOf();
  const me = useMe().data?.id;
  const [team = "", number = ""] = t.task_key.split("-");
  const author = t.latest.author_name ?? "Sistema";
  return (
    <li>
      <Link
        to="/t/$team/$number"
        params={{ team, number }}
        className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            t.unread > 0 ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              {t.task_key}
            </span>
            <span
              className={cn("truncate text-sm", t.unread > 0 && "font-medium")}
            >
              {t.task_title}
            </span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            <span className="text-foreground">
              {author}
              {t.latest.kind === "comment" && ":"}
            </span>{" "}
            {describeUpdate(t.latest, nameOf, me)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {t.mentioned && <Badge variant="outline">Te mencionó</Badge>}
          {t.unread > 1 && (
            <Badge variant="secondary" aria-label={`${t.unread} sin leer`}>
              {t.unread}
            </Badge>
          )}
          {relativeTime(t.latest.created_at)}
        </span>
      </Link>
    </li>
  );
}
