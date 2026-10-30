import { z } from "zod";
import { TASK_STATUSES } from "./types";

// Every message names the field and says what is wrong, in Spanish, because the
// web client shows it to the user as is.

const wrong = (field: string, expected: string) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined
      ? `${field} es obligatorio`
      : `${field} debe ser ${expected}`,
});

const text = (field: string, max = 10000) =>
  z
    .string(wrong(field, "texto"))
    .trim()
    .min(1, `${field} no puede estar vacío`)
    .max(max, `${field} no puede superar ${max} caracteres`);

const plain = (field: string) => z.string(wrong(field, "texto"));

const oneOf = <T extends string>(
  field: string,
  allowed: readonly [T, ...T[]],
) =>
  z.enum(allowed, {
    error: `${field} debe ser uno de: ${allowed.join(", ")}`,
  });

const ids = (field: string) =>
  z.array(z.string(), { error: `${field} debe ser una lista de ids` });

const isCalendarDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
};

const dateMessage = (field: string) =>
  `${field} debe tener el formato AAAA-MM-DD o ser null`;

const dateOnly = (field: string) =>
  z
    .string({ error: dateMessage(field) })
    .regex(/^\d{4}-\d{2}-\d{2}$/, dateMessage(field))
    .refine(isCalendarDate, dateMessage(field));

const nullableDate = (field: string) => dateOnly(field).nullable();

const timestamp = (field: string) =>
  text(field, 40).refine((value) => !Number.isNaN(Date.parse(value)), {
    error: `${field} debe ser una fecha y hora válida`,
  });

const visibility = oneOf("visibility", ["open", "private"]);
const status = oneOf("status", TASK_STATUSES);

export const teamKey = text("key", 6)
  .toUpperCase()
  .regex(
    /^[A-Z][A-Z0-9]{1,5}$/,
    "key debe tener de 2 a 6 letras o números y empezar con una letra",
  );

export const createTeam = z.object({
  key: teamKey,
  name: text("name", 100),
  leaders: ids("leaders").default([]),
});

export const patchTeam = z.object({
  name: text("name", 100).optional(),
});

export const setMember = z.object({
  role: oneOf("role", ["leader", "member"]).default("member"),
});

export const createProject = z.object({
  name: text("name", 100),
  description: plain("description").default(""),
  start_date: nullableDate("start_date").default(null),
  target_date: nullableDate("target_date").default(null),
});

export const patchProject = z.object({
  name: text("name", 100).optional(),
  description: plain("description").optional(),
  status: oneOf("status", ["active", "done", "archived"]).optional(),
  start_date: nullableDate("start_date").optional(),
  target_date: nullableDate("target_date").optional(),
});

export const createLabel = z.object({
  team_id: z.string({ error: "team_id debe ser texto" }).nullish(),
  name: text("name", 40),
  color: plain("color").default("#6b7280"),
});

export const createTask = z.object({
  team: text("team", 6),
  parent: text("parent", 20).optional(),
  title: text("title", 300),
  description: plain("description").default(""),
  labels: ids("labels").default([]),
  visibility: visibility.default("open"),
  status: status.default("todo"),
  owner_id: z.string({ error: "owner_id debe ser texto o null" }).nullish(),
  project_id: z.string({ error: "project_id debe ser texto o null" }).nullish(),
  start_date: nullableDate("start_date").default(null),
  due_date: nullableDate("due_date").default(null),
});

export const patchTask = z.object({
  title: text("title", 300).optional(),
  description: plain("description").optional(),
  visibility: visibility.optional(),
  project_id: z
    .string({ error: "project_id debe ser texto o null" })
    .nullable()
    .optional(),
  status: status.optional(),
  owner_id: z
    .string({ error: "owner_id debe ser texto o null" })
    .nullable()
    .optional(),
  start_date: nullableDate("start_date").optional(),
  due_date: nullableDate("due_date").optional(),
  labels: ids("labels").optional(),
});

export const comment = z.object({ body: text("body") });

export const createEvent = z.object({
  team: z.string({ error: "team debe ser texto o null" }).nullish(),
  title: text("title", 300),
  description: plain("description").default(""),
  starts_at: timestamp("starts_at"),
  ends_at: timestamp("ends_at").nullish(),
  all_day: z
    .boolean({ error: "all_day debe ser verdadero o falso" })
    .default(false),
});

export const patchEvent = z.object({
  title: text("title", 300).optional(),
  description: plain("description").optional(),
  starts_at: timestamp("starts_at").optional(),
  ends_at: timestamp("ends_at").nullable().optional(),
  all_day: z
    .boolean({ error: "all_day debe ser verdadero o falso" })
    .optional(),
});

export const devLogin = z.object({
  email: text("email", 200),
  name: text("name", 200).optional(),
});

export const dateRange = z.object({
  from: dateOnly("from").optional(),
  to: dateOnly("to").optional(),
});

export const TASK_PAGE_MAX = 500;
export const TASK_PAGE_DEFAULT = 100;

const pageSize = `limit debe ser un entero de 1 a ${TASK_PAGE_MAX}`;

// Query-string values arrive as strings, so numbers and lists are parsed here.
export const taskQuery = z.object({
  team: z.string().optional(),
  owner: z.string().optional(),
  status: z
    .string()
    .transform((value) => value.split(","))
    .pipe(z.array(oneOf("status", TASK_STATUSES)))
    .optional(),
  open: z.string().optional(),
  project: z.string().optional(),
  label: z.string().optional(),
  due_before: dateOnly("due_before").optional(),
  due_after: dateOnly("due_after").optional(),
  collaborator: z.string().optional(),
  top: z.string().optional(),
  q: z.string().optional(),
  limit: z
    .string({ error: pageSize })
    .regex(/^\d+$/, pageSize)
    .transform(Number)
    .pipe(z.number().min(1, pageSize).max(TASK_PAGE_MAX, pageSize))
    .default(TASK_PAGE_DEFAULT),
  cursor: z.string().optional(),
});

export type CreateTask = z.infer<typeof createTask>;
export type PatchTask = z.infer<typeof patchTask>;
export type TaskQuery = z.infer<typeof taskQuery>;
