import { describe, expect, test } from "bun:test";
import type { Task } from "../src/web/api";
import {
  addDays,
  dropOnDay,
  filterTasks,
  groupByDue,
  linkify,
  monthGrid,
  NO_FILTERS,
  searchPalette,
  summarizeProjects,
  weekGrid,
  type PaletteItem,
} from "../src/web/lib";
import type { Project } from "../src/web/api";

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
  test("project none matches tasks outside any project", () => {
    expect(
      filterTasks(tasks, { ...NO_FILTERS, project: "none" }).map((t) => t.key),
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

describe("summarizeProjects", () => {
  const project = (over: Partial<Project>): Project => ({
    id: "p",
    team_id: "t",
    name: "p",
    description: "",
    status: "active",
    target_date: null,
    ...over,
  });
  const summary = summarizeProjects(
    [
      project({ id: "web", target_date: "2026-12-15" }),
      project({ id: "funding" }),
      project({ id: "old", target_date: "2026-01-01", status: "done" }),
    ],
    [
      task({ key: "A-1", project_id: "web", status: "done" }),
      task({ key: "A-2", project_id: "web" }),
      task({ key: "A-3", project_id: "web", status: "canceled" }),
      task({ key: "A-4", project_id: "funding", due_date: "2026-12-01" }),
      task({ key: "A-5", project_id: "funding", due_date: "2026-11-30" }),
      task({ key: "A-6", project_id: "funding", status: "done" }),
      task({ key: "A-7" }),
      task({ key: "A-8", status: "done" }),
    ],
  );
  test("a target date makes a project, none makes an area", () => {
    expect(summary.projects.map((s) => s.project.id)).toEqual(["web"]);
    expect(summary.areas.map((s) => s.project.id)).toEqual(["funding"]);
  });
  test("progress ignores canceled tasks", () => {
    expect(summary.projects[0]?.progress).toBe(0.5);
  });
  test("an area counts open tasks and its nearest due date", () => {
    expect(summary.areas[0]).toMatchObject({ open: 2, nextDue: "2026-11-30" });
  });
  test("loose counts open tasks outside any project", () => {
    expect(summary.loose).toBe(1);
  });
});

describe("linkify", () => {
  test("splits URLs from text and keeps trailing punctuation out", () => {
    expect(
      linkify(
        "Sheet: https://docs.google.com/x?a=1. Repo https://github.com/r",
      ),
    ).toEqual([
      { text: "Sheet: " },
      {
        text: "https://docs.google.com/x?a=1",
        url: "https://docs.google.com/x?a=1",
      },
      { text: ". Repo " },
      { text: "https://github.com/r", url: "https://github.com/r" },
    ]);
  });
  test("text without URLs is one segment", () => {
    expect(linkify("no links here")).toEqual([{ text: "no links here" }]);
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
