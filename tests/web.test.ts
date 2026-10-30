import { describe, expect, test } from "bun:test";
import type { InboxItem, Task, User } from "../src/shared/types";
import { addDays, monthGrid, shortDay, weekGrid } from "../src/web/lib/dates";
import {
  insertMention,
  matchPeople,
  mentionAt,
  mentionHandle,
} from "../src/web/lib/mentions";
import { searchPalette, type PaletteItem } from "../src/web/lib/palette";
import {
  dropOnDay,
  groupByDue,
  taskQuery,
  type TaskFilters,
} from "../src/web/lib/tasks";
import { linkify } from "../src/web/lib/text";
import { describeUpdate, groupInbox } from "../src/web/lib/updates";

const task = (over: Partial<Task>): Task => ({
  id: "x",
  key: "ENG-1",
  team: "ENG",
  number: 1,
  title: "t",
  description: "",
  status: "todo",
  visibility: "open",
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

describe("taskQuery", () => {
  const today = "2026-10-29";
  const cases: {
    name: string;
    base: Record<string, string>;
    filters: TaskFilters & { view?: string; task?: string };
    want: Record<string, string>;
  }[] = [
    {
      name: "no filters keeps the base",
      base: { owner: "me", open: "1" },
      filters: {},
      want: { owner: "me", open: "1" },
    },
    {
      name: "filters add to the base and trim",
      base: { team: "ENG", top: "1" },
      filters: { owner: "none", status: "blocked", q: "  paper " },
      want: {
        team: "ENG",
        top: "1",
        owner: "none",
        status: "blocked",
        q: "paper",
      },
    },
    {
      name: "blank text is dropped",
      base: { team: "ENG" },
      filters: { q: "   " },
      want: { team: "ENG" },
    },
    {
      name: "view state never reaches the query",
      base: { team: "ENG" },
      filters: { view: "board", task: "ENG-4" },
      want: { team: "ENG" },
    },
    {
      name: "overdue means open and due before today",
      base: { team: "ENG" },
      filters: { due: "overdue" },
      want: { team: "ENG", open: "1", due_before: "2026-10-28" },
    },
    {
      name: "week runs from today to seven days ahead",
      base: { owner: "me" },
      filters: { due: "week" },
      want: {
        owner: "me",
        open: "1",
        due_after: "2026-10-29",
        due_before: "2026-11-05",
      },
    },
  ];
  for (const { name, base, filters, want } of cases)
    test(name, () => {
      expect(taskQuery(base, filters, today)).toEqual(want);
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

describe("mentions", () => {
  const person = (name: string, email: string): User => ({
    id: email,
    name,
    email,
    avatar_url: null,
    kind: "person",
  });
  const people = [
    person("Mateo Quispe", "mateo@example.test"),
    person("Lucía Paredes", "lucia@example.test"),
    person("Pedro Rojas", "pedro.rojas.f24@gmail.com"),
  ];
  test("the caret after an @ word opens a query", () => {
    expect(mentionAt("hola @luc", 9)).toEqual({ start: 5, query: "luc" });
    expect(mentionAt("@", 1)).toEqual({ start: 0, query: "" });
  });
  test("an email or a finished word opens nothing", () => {
    expect(mentionAt("ana@example", 11)).toBeNull();
    expect(mentionAt("@luc hola", 9)).toBeNull();
  });
  test("matching ignores accents and ranks handles and first names first", () => {
    expect(matchPeople(people, "luc").map((u) => u.name)).toEqual([
      "Lucía Paredes",
    ]);
    expect(matchPeople(people, "ro").map((u) => u.name)).toEqual([
      "Pedro Rojas",
    ]);
    expect(matchPeople(people, "p").map((u) => u.name)).toEqual([
      "Pedro Rojas",
      "Lucía Paredes",
      "Mateo Quispe",
    ]);
  });
  test("picking replaces the query with the email handle", () => {
    expect(
      insertMention("hola @pe y más", 5, 8, mentionHandle(people[2]!)),
    ).toEqual({ text: "hola @pedro.rojas.f24  y más", caret: 22 });
  });
});

describe("describeUpdate", () => {
  const names: Record<string, string> = { caro: "Caro Diaz", ben: "Ben Cole" };
  const nameOf = (id: string) => names[id] ?? "alguien";
  const say = (
    kind: string,
    meta: Record<string, unknown>,
    author = "ben",
    me = "caro",
  ) => describeUpdate({ kind, body: "", meta, author_id: author }, nameOf, me);
  test("owner changes name the new owner, or the reader", () => {
    expect(say("owner", { from: null, to: "caro" })).toBe("te asignó la tarea");
    expect(say("owner", { from: "caro", to: "ben" })).toBe(
      "asignó la tarea a Ben Cole",
    );
    expect(say("owner", { from: "caro", to: null })).toBe(
      "quitó al responsable",
    );
  });
  test("collaborator changes tell joining from being added", () => {
    expect(say("collaborator", { added: "ben" })).toBe("se unió");
    expect(say("collaborator", { added: "caro" })).toBe("te agregó");
    expect(say("collaborator", { removed: "caro" })).toBe(
      "te quitó de la tarea",
    );
    expect(say("collaborator", { added: "caro" }, "ben", "ben")).toBe(
      "agregó a Caro Diaz",
    );
  });
  test("a due change shows the day, a comment its body", () => {
    expect(say("due", { from: null, to: "2026-11-03" })).toBe(
      `cambió la entrega al ${shortDay("2026-11-03")}`,
    );
    expect(
      describeUpdate(
        { kind: "comment", body: "hola", meta: {}, author_id: "ben" },
        nameOf,
      ),
    ).toBe("hola");
  });
});

describe("groupInbox", () => {
  const item = (over: Partial<InboxItem>): InboxItem => ({
    id: "i",
    kind: "comment",
    body: "",
    meta: {},
    created_at: "2026-10-01T00:00:00.000Z",
    author_id: "ben",
    author_name: "Ben",
    task_key: "ENG-1",
    task_title: "t",
    unread: false,
    mentioned: false,
    ...over,
  });
  test("one thread per task, newest first, counting only unread items", () => {
    const threads = groupInbox([
      item({ id: "a", created_at: "2026-10-03T00:00:00.000Z", unread: true }),
      item({ id: "b", task_key: "ENG-2", created_at: "2026-10-04T00:00:00Z" }),
      item({ id: "c", created_at: "2026-10-02T00:00:00.000Z", unread: true }),
      item({ id: "d", created_at: "2026-10-01T00:00:00.000Z" }),
    ]);
    expect(threads.map((t) => [t.task_key, t.latest.id, t.unread])).toEqual([
      ["ENG-2", "b", 0],
      ["ENG-1", "a", 2],
    ]);
  });
  test("only an unread mention marks the thread", () => {
    const [read] = groupInbox([item({ mentioned: true })]);
    const [fresh] = groupInbox([item({ mentioned: true, unread: true })]);
    expect([read?.mentioned, fresh?.mentioned]).toEqual([false, true]);
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
