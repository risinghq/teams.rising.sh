export type Interval = { start: string; end: string };

// The working day the free/busy grid shows, in local hours, and its step.
export const DAY_FROM = 8;
export const DAY_TO = 20;
export const STEP_MIN = 30;

const MINUTE = 60_000;

// The local start of each step of `day`'s working day.
export function steps(day: string): Date[] {
  const midnight = new Date(`${day}T00:00`).getTime();
  const out: Date[] = [];
  for (let m = DAY_FROM * 60; m < DAY_TO * 60; m += STEP_MIN)
    out.push(new Date(midnight + m * MINUTE));
  return out;
}

export const overlaps = (busy: Interval[], start: Date, minutes: number) => {
  const s = start.getTime();
  const e = s + minutes * MINUTE;
  return busy.some((b) => Date.parse(b.start) < e && Date.parse(b.end) > s);
};

// The starts on `day` at which nobody is busy for `minutes` and the meeting
// ends within the working day. A start before `now` is not offered.
export function freeStarts(
  people: Interval[][],
  day: string,
  minutes: number,
  now = Date.now(),
): Date[] {
  const close = new Date(`${day}T00:00`).getTime() + DAY_TO * 60 * MINUTE;
  return steps(day).filter(
    (start) =>
      start.getTime() >= now &&
      start.getTime() + minutes * MINUTE <= close &&
      people.every((busy) => !overlaps(busy, start, minutes)),
  );
}
