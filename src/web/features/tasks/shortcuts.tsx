import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, CalendarClock, OctagonAlert } from "lucide-react";
import type { ComponentType } from "react";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useInbox } from "@/features/inbox/hooks";
import { useOverview } from "@/features/overview/hooks";
import { useMe } from "@/features/teams/hooks";
import { usePeekTasks } from "./hooks";
import type { MyWorkSearch } from "./search";

const WEEK_PEEK = 100;

const CARD =
  "flex flex-col items-start gap-1 rounded-xl p-4 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-foreground/25";

function Body({
  Icon,
  tone,
  count,
  label,
}: {
  Icon: ComponentType<{ className?: string }>;
  tone: string;
  count: string;
  label: string;
}) {
  return (
    <>
      <Icon className={cn("size-4", tone)} aria-hidden />
      <span className="text-2xl font-semibold tabular-nums">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );
}

type Shortcut = Pick<MyWorkSearch, "due" | "status">;

// A card is the filter for its count: the first click applies it, a second
// click on the same card clears it.
export function Shortcuts({
  today,
  search,
}: {
  today: string;
  search: MyWorkSearch;
}) {
  const toggle = (pick: Shortcut) => {
    const on = search.due === pick.due && search.status === pick.status;
    return {
      to: "/" as const,
      search: (prev: MyWorkSearch) => ({
        ...prev,
        due: undefined,
        status: undefined,
        ...(on ? {} : pick),
      }),
      "aria-current": on ? ("true" as const) : undefined,
    };
  };
  const me = useMe().data;
  const overview = useOverview().data;
  const unread = useInbox().data?.unread;
  const week = usePeekTasks(
    {
      owner: "me",
      open: "1",
      due_after: today,
      due_before: addDays(today, 7),
    },
    WEEK_PEEK,
  ).data;
  // An owner missing from the overview has no open work, but that reads as
  // zero only once both the overview and the signed-in user have loaded.
  const mine =
    overview && me
      ? (overview.owners.find((o) => o.id === me.id) ?? {
          overdue: 0,
          blocked: 0,
        })
      : undefined;
  const count = (n: number | undefined) => (n === undefined ? "–" : String(n));

  return (
    <nav aria-label="Atajos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Link
        {...toggle({ due: "overdue" })}
        className={cn(CARD, "bg-destructive/10 hover:bg-destructive/15")}
      >
        <Body
          Icon={AlertTriangle}
          tone="text-destructive"
          count={count(mine?.overdue)}
          label="Atrasadas"
        />
      </Link>
      <Link
        {...toggle({ due: "week" })}
        className={cn(CARD, "bg-warn/10 hover:bg-warn/15")}
      >
        <Body
          Icon={CalendarClock}
          tone="text-warn"
          count={week ? `${week.items.length}${week.next ? "+" : ""}` : "–"}
          label="Vencen esta semana"
        />
      </Link>
      <Link
        {...toggle({ status: "blocked" })}
        className={cn(CARD, "bg-primary/10 hover:bg-primary/15")}
      >
        <Body
          Icon={OctagonAlert}
          tone="text-primary"
          count={count(mine?.blocked)}
          label="Bloqueadas"
        />
      </Link>
      <Link to="/inbox" className={cn(CARD, "bg-ok/10 hover:bg-ok/15")}>
        <Body
          Icon={Bell}
          tone="text-ok"
          count={count(unread)}
          label="Sin leer en la bandeja"
        />
      </Link>
    </nav>
  );
}
