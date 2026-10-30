import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useWrite } from "@/hooks/use-write";
import { eventRemoved } from "@/lib/optimistic";
import { queryKeys } from "@/lib/query-keys";

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.calendar.range(from, to),
    queryFn: () => api.calendar(from, to),
  });

// Busy times for `day`, local midnight to midnight. The last answer stays on
// screen while a new person or day loads, so the grid does not blink.
export const useFreeBusy = (users: string[], day: string) =>
  useQuery({
    queryKey: queryKeys.freeBusy.day(day, users),
    queryFn: () => {
      const start = new Date(`${day}T00:00`);
      const end = new Date(start.getTime() + 86400_000);
      return api.freeBusy(users, start.toISOString(), end.toISOString());
    },
    enabled: users.length > 0 && day !== "",
    placeholderData: keepPreviousData,
  });

export const useCreateEvent = () =>
  useWrite(
    "createEvent",
    (body: Record<string, unknown>) => api.createEvent(body),
    { inline: true },
  );

export const useDeleteEvent = () =>
  useWrite("deleteEvent", ({ id }: { id: string }) => api.deleteEvent(id), {
    optimistic: eventRemoved,
  });
