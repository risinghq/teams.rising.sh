export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => iso(new Date());

// Dates are shown in Spanish, as is the rest of the interface.
export const day = (d: Date, options: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString("es", options);

export const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const shortDay = (s: string) =>
  day(parseDay(s), { month: "short", day: "numeric" });

export const addDays = (s: string, n: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

// A real calendar day written as YYYY-MM-DD. `parseDay` alone accepts anything.
export const isDay = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parseDay(s)) === s;

export function monthGrid(anchor: string): string[] {
  const first = parseDay(`${anchor.slice(0, 7)}-01`);
  const lead = (first.getDay() + 6) % 7;
  const start = addDays(iso(first), -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekGrid(anchor: string): string[] {
  const lead = (parseDay(anchor).getDay() + 6) % 7;
  const start = addDays(anchor, -lead);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// The first day of the month `dir` months away, so stepping never skips a
// short month.
export function stepMonth(anchor: string, dir: 1 | -1): string {
  const d = parseDay(anchor);
  d.setMonth(d.getMonth() + dir, 1);
  return iso(d);
}

export function relativeTime(then: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(then)) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}
