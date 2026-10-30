import type { Context } from "hono";
import type { z } from "zod";
import type { Env } from "./env";

export type C = Context<Env>;

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

export const id = () => crypto.randomUUID();

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues[0]?.message ?? "solicitud inválida",
    );
  }
  return result.data;
}

// Validates the JSON body. A 400 carries the first problem, in Spanish.
export async function parseBody<S extends z.ZodType>(
  c: C,
  schema: S,
): Promise<z.output<S>> {
  const value: unknown = await c.req.json().catch(() => null);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "el cuerpo debe ser un objeto JSON");
  }
  return parse(schema, value);
}

// Validates the query string. A parameter given empty counts as absent.
export function parseQuery<S extends z.ZodType>(c: C, schema: S): z.output<S> {
  const given = Object.entries(c.req.query()).filter(([, v]) => v !== "");
  return parse(schema, Object.fromEntries(given));
}
