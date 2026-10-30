import type { Context } from "hono";
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

export async function body(c: C): Promise<Record<string, unknown>> {
  const value = await c.req.json().catch(() => null);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "el cuerpo debe ser un objeto JSON");
  }
  return value as Record<string, unknown>;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }
  throw new HttpError(400, `${field} debe ser uno de: ${allowed.join(", ")}`);
}

export function text(value: unknown, field: string, max = 10000): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) {
    throw new HttpError(400, `${field} no puede estar vacío`);
  }
  return value.trim();
}

export function date(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  throw new HttpError(
    400,
    `${field} debe tener el formato AAAA-MM-DD o ser null`,
  );
}
