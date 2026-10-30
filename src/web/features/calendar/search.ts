import { z } from "zod";
import { isDay } from "@/lib/dates";
import { compact, taskParam } from "@/features/tasks/search";

// Month is the default range and the current day the default anchor, so only
// `mode=week`, another day and the open task reach the URL.
export type CalendarSearch = {
  mode?: "week";
  date?: string;
  task?: string;
};

const shape = z.object({
  mode: z.literal("week").optional().catch(undefined),
  date: z.string().refine(isDay).optional().catch(undefined),
  task: taskParam,
});

// `today` is a parameter so the validator stays pure: a URL that names the
// current day is the default view.
export function parseCalendarSearch(
  raw: Record<string, unknown>,
  today: string,
): CalendarSearch {
  const parsed = shape.parse(raw);
  return compact({
    ...parsed,
    date: parsed.date === today ? undefined : parsed.date,
  });
}
