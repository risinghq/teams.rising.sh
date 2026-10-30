import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/lib/query-keys";

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.calendar.range(from, to),
    queryFn: () => api.calendar(from, to),
  });
