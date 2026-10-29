import { describe, expect, test } from "bun:test";
import type { Task } from "../src/web/api";
import {
  addDays,
  dropOnDay,
  filterTasks,
  groupByDue,
  monthGrid,
  NO_FILTERS,
  searchPalette,
  weekGrid,
  type PaletteItem,
} from "../src/web/lib";

const task = (over: Partial<Task>): Task => ({
  id: "x",
  key: "ENG-1",
  team: "ENG",
  number: 1,
  title: "t",
  description: "",
  status: "todo",
  visibility: "open",
  priority: 0,
  start_date: null,
  due_date: null,
  project_id: null,
  parent_id: null,
  owner: null,
  labels: [],
  progress: 0,
  subtask_count: 0,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("groupByDue", () => {
  test("buckets by day relative to today, in display order", () => {
    const today = "2026-10-29";
    const groups = groupByDue(
      [
        task({ key: "A-1", due_date: "2026-11-30" }),
        task({ key: "A-2", due_date: "2026-10-28" }),
        task({ key: "A-3", due_date: "2026-10-29" }),
        task({ key: "A-4", due_date: "2026-11-05" }),
        task({ key: "A-5" }),
        task({ key: "A-6", due_date: "2026-10-01", status: "done" }),
      ],
      today,
    );
    expect(groups.map((g) => [g.id, g.items.map((i) => i.key)])).toEqual([
      ["overdue", ["A-2"]],
      ["today", ["A-3"]],
      ["week", ["A-4"]],
      ["later", ["A-1"]],
      ["none", ["A-5"]],
      ["closed", ["A-6"]],
    ]);
  });
});

describe("filterTasks", () => {
  const ana = { id: "u1", name: "Ana", avatar_url: null };
  const tasks = [
    task({ key: "A-1", owner: ana, status: "done", project_id: "p1" }),
    task({
      key: "A-2",
      owner: null,
      labels: [{ id: "l1", name: "code", color: "#000" }],
    }),
  ];
  test("no filters keeps everything", () => {
    expect(filterTasks(tasks, NO_FILTERS)).toHaveLength(2);
  });
  test("owner none matches unassigned tasks", () => {
    expect(
      filterTasks(tasks, { ...NO_FILTERS, owner: "none" }).map((t) => t.key),
    ).toEqual(["A-2"]);
  });
  test("filters combine", () => {
    expect(
      filterTasks(tasks, {
        ...NO_FILTERS,
        owner: "u1",
        status: "done",
        project: "p1",
      }),
    ).toHaveLength(1);
    expect(
      filterTasks(tasks, { ...NO_FILTERS, owner: "u1", label: "l1" }),
    ).toHaveLength(0);
  });
});

describe("dropOnDay", () => {
  test("changes the due date to the dropped day", () => {
    expect(dropOnDay(task({ due_date: "2026-10-01" }), "2026-10-05")).toEqual({
      key: "ENG-1",
      patch: { due_date: "2026-10-05" },
    });
  });
  test("dropping on the same day changes nothing", () => {
    expect(
      dropOnDay(task({ due_date: "2026-10-05" }), "2026-10-05"),
    ).toBeNull();
  });
});

describe("searchPalette", () => {
  const items: PaletteItem[] = [
    {
      id: "1",
      kind: "task",
      label: "Book the venue",
      hint: "OPS-1",
      to: "/t/OPS/1",
    },
    { id: "2", kind: "team", label: "Logistics", hint: "OPS", to: "/t/OPS" },
    {
      id: "3",
      kind: "task",
      label: "Venue map",
      hint: "ENG-4",
      to: "/t/ENG/4",
    },
  ];
  test("matches words in any order", () => {
    expect(searchPalette(items, "venue book").map((i) => i.id)).toEqual(["1"]);
  });
  test("a key prefix ranks its team before tasks", () => {
    expect(searchPalette(items, "ops").map((i) => i.id)).toEqual(["2", "1"]);
  });
  test("an empty query lists the first items", () => {
    expect(searchPalette(items, "", 2)).toHaveLength(2);
  });
});

describe("grids", () => {
  test("a month grid is six Monday-first weeks that contain the month", () => {
    const g = monthGrid("2026-10-15");
    expect(g).toHaveLength(42);
    expect(new Date(`${g[0]}T00:00:00`).getDay()).toBe(1);
    expect(g).toContain("2026-10-01");
    expect(g).toContain("2026-10-31");
  });
  test("a week grid starts on Monday", () => {
    expect(weekGrid("2026-10-29")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
