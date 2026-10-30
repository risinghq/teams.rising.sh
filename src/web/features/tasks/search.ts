import { z } from "zod";
import { parseStatus, type TaskStatus } from "@/lib/domain";

// Search params keep only what differs from the default view. A value that
// is unknown, malformed or equal to the default is dropped, so a stale or
// hand-edited URL falls back to the default instead of failing.

// The router parses `?q=123` into a number, so numbers count as text.
const text = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().min(1))
  .optional()
  .catch(undefined);

const status = z
  .custom<TaskStatus>((v) => parseStatus(v) !== undefined)
  .optional()
  .catch(undefined);

const board = z.literal("board").optional().catch(undefined);

const due = z.enum(["overdue", "week"]).optional().catch(undefined);

export const taskParam = text;

const myWorkShape = {
  status,
  due,
  label: text,
  q: text,
  view: board,
  task: text,
};

const teamShape = { ...myWorkShape, owner: text, project: text };

export type MyWorkSearch = z.infer<z.ZodObject<typeof myWorkShape>>;
export type TeamSearch = z.infer<z.ZodObject<typeof teamShape>>;

const myWorkSchema = z.object(myWorkShape);
const teamSchema = z.object(teamShape);

// Parsing leaves dropped params as `undefined`; the URL and equality checks
// want them absent.
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

export const parseMyWorkSearch = (raw: Record<string, unknown>): MyWorkSearch =>
  compact(myWorkSchema.parse(raw));

export const parseTeamSearch = (raw: Record<string, unknown>): TeamSearch =>
  compact(teamSchema.parse(raw));
