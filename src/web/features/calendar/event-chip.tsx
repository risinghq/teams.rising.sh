import { Video } from "lucide-react";
import type { CalEvent } from "@shared/types";
import { cn } from "@/lib/cn";
import { useMe } from "@/features/teams/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { useDeleteEvent } from "./hooks";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });

// An event's title, which opens its time, guests and Meet link. Eliminar shows
// to its creator only, though the API also accepts a team leader.
export function EventChip({
  event,
  className,
}: {
  event: CalEvent;
  className?: string;
}) {
  const me = useMe().data;
  const remove = useDeleteEvent();
  const when = event.all_day
    ? "Todo el día"
    : event.ends_at
      ? `${clock(event.starts_at)} – ${clock(event.ends_at)}`
      : clock(event.starts_at);
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "block w-full truncate text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {!event.all_day && (
          <span className="mr-1 text-muted-foreground">
            {clock(event.starts_at)}
          </span>
        )}
        {event.title}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-3 text-sm">
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="text-muted-foreground">{when}</p>
        </div>
        {event.description && (
          <p className="whitespace-pre-wrap">{event.description}</p>
        )}
        {event.attendees.length > 0 && (
          <ul className="flex flex-col gap-1">
            {event.attendees.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <PersonAvatar person={p} size={18} />
                {p.name}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          {event.meet_url && (
            <Button asChild size="sm">
              <a href={event.meet_url} target="_blank" rel="noreferrer">
                <Video /> Unirse con Google Meet
              </a>
            </Button>
          )}
          {me?.id === event.created_by && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              onClick={() => remove.mutate({ id: event.id })}
            >
              Eliminar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
