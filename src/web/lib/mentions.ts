import type { User } from "@shared/types";

// The server resolves `@handle` to the user whose email local part is the
// handle, so the picker inserts that part.
export const mentionHandle = (u: Pick<User, "email">) =>
  u.email.split("@")[0] ?? "";

// The `@word` the caret is in, if any. An `@` counts only at the start of the
// text or after a space, so an email address typed in full opens nothing.
export function mentionAt(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const m = /(^|\s)@([\w.-]*)$/.exec(text.slice(0, caret));
  if (!m) return null;
  return { start: caret - (m[2]?.length ?? 0) - 1, query: m[2] ?? "" };
}

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// People whose name or handle contains the query. A handle or first name that
// starts with it ranks first, then any other word, then a match inside a word.
// Accents are ignored, so "lucia" finds Lucía.
export function matchPeople(users: User[], query: string, limit = 6): User[] {
  const q = fold(query);
  const rank = (u: User) => {
    const words = fold(u.name).split(/\s+/);
    const handle = fold(mentionHandle(u));
    if (handle.startsWith(q) || words[0]?.startsWith(q)) return 0;
    if (words.some((w) => w.startsWith(q))) return 1;
    if (handle.includes(q) || words.some((w) => w.includes(q))) return 2;
    return -1;
  };
  return users
    .map((u) => ({ u, r: rank(u) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ u }) => u);
}

// Replaces the `@query` between `start` and `caret` with the handle and a
// space, and returns where the caret goes.
export function insertMention(
  text: string,
  start: number,
  caret: number,
  handle: string,
): { text: string; caret: number } {
  const inserted = `@${handle} `;
  return {
    text: text.slice(0, start) + inserted + text.slice(caret),
    caret: start + inserted.length,
  };
}
