import { z } from "zod";
import { HttpError } from "../http";

// The list order. The last key is unique, so the order is total and a page
// boundary never splits a tie. NULL due dates sort last through the first key,
// parenthesized because IS binds looser than the comparisons built from it.
const KEYS = [
  { expr: "(t.due_date IS NULL)", desc: false },
  { expr: "COALESCE(t.due_date, '')", desc: false },
  { expr: "t.updated_at", desc: true },
  { expr: "t.id", desc: false },
];

export const ORDER_BY = KEYS.map((k) => k.expr + (k.desc ? " DESC" : "")).join(
  ", ",
);

type Position = {
  id: string;
  due_date: string | null;
  updated_at: string;
};

const cursorShape = z.tuple([
  z.union([z.literal(0), z.literal(1)]),
  z.string(),
  z.string(),
  z.string(),
]);

type Cursor = z.infer<typeof cursorShape>;

const b64 = (s: string) =>
  btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Opaque to clients: the sort key of the last task on the page.
export function cursorOf(row: Position): string {
  const cursor: Cursor = [
    row.due_date === null ? 1 : 0,
    row.due_date ?? "",
    row.updated_at,
    row.id,
  ];
  return b64(JSON.stringify(cursor));
}

function decode(cursor: string): Cursor {
  try {
    const json = atob(cursor.replace(/-/g, "+").replace(/_/g, "/"));
    return cursorShape.parse(JSON.parse(json));
  } catch {
    throw new HttpError(400, "cursor no es válido");
  }
}

// WHERE condition that keeps the tasks sorted after the cursor's position.
export function after(cursor: string): { sql: string; params: unknown[] } {
  const values = decode(cursor);
  const params: unknown[] = [];
  const branches = KEYS.map((key, i) => {
    const equal = KEYS.slice(0, i).map((prev, j) => {
      params.push(values[j]);
      return `${prev.expr} = ?`;
    });
    params.push(values[i]);
    return `(${[...equal, `${key.expr} ${key.desc ? "<" : ">"} ?`].join(" AND ")})`;
  });
  return { sql: `(${branches.join(" OR ")})`, params };
}
