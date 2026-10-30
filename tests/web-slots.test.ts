import { expect, test } from "bun:test";
import { freeStarts, steps } from "../src/web/lib/slots";

const DAY = "2026-11-02";
const at = (time: string) => new Date(`${DAY}T${time}`);
const busy = (start: string, end: string) => ({
  start: at(start).toISOString(),
  end: at(end).toISOString(),
});
const times = (dates: Date[]) =>
  dates.map(
    (d) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  );
const MORNING = at("00:00").getTime();

test("the working day runs 8:00 to 20:00 in half hours", () => {
  const all = times(steps(DAY));
  expect(all[0]).toBe("08:00");
  expect(all.at(-1)).toBe("19:30");
  expect(all).toHaveLength(24);
});

test("a start is offered only when everyone is free for the whole meeting", () => {
  const ana = [busy("08:00", "10:00")];
  const ben = [busy("10:30", "11:00"), busy("12:00", "19:00")];
  expect(times(freeStarts([ana, ben], DAY, 60, MORNING))).toEqual([
    "11:00",
    "19:00",
  ]);
});

test("the meeting must end by 20:00 and not start in the past", () => {
  expect(times(freeStarts([[]], DAY, 120, at("17:10").getTime()))).toEqual([
    "17:30",
    "18:00",
  ]);
});
