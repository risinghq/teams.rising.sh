import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  invalidateAfter,
  invalidations,
  type WriteName,
  type WriteScope,
} from "../src/web/lib/invalidation";
import { queryKeys as k } from "../src/web/lib/query-keys";

// Every query the app can hold, by a name the cases below use.
const cached = {
  me: k.me,
  users: k.users,
  labels: k.labels,
  teams: k.teams.list,
  "team ENG": k.teams.detail("ENG"),
  "team OPS": k.teams.detail("OPS"),
  "projects ENG": k.projects.ofTeam("ENG"),
  "projects OPS": k.projects.ofTeam("OPS"),
  "task list": k.tasks.list({ team: "ENG", top: "1" }),
  "my tasks": k.tasks.list({ owner: "me", open: "1" }),
  "task peek": k.tasks.peek({ q: "paper", limit: "20" }),
  "task ENG-1": k.tasks.detail("ENG-1"),
  "task ENG-2": k.tasks.detail("ENG-2"),
  "task ENG-3": k.tasks.detail("ENG-3"),
  calendar: k.calendar.range("2026-10-01", "2026-11-11"),
  inbox: k.inbox,
  overview: k.overview,
} as const;
type Cached = keyof typeof cached;

const invalidatedBy = async <N extends WriteName>(
  name: N,
  scope: WriteScope<N>,
) => {
  const client = new QueryClient();
  for (const key of Object.values(cached))
    client.setQueryData(key, key[1] === "detail" ? { id: `id-${key[2]}` } : []);
  await invalidateAfter(client, name, scope);
  return (Object.keys(cached) as Cached[]).filter(
    (name) => client.getQueryState(cached[name])?.isInvalidated,
  );
};

type Case = { write: string; run: () => Promise<Cached[]>; want: Cached[] };

const cases: Case[] = [
  {
    write: "createTask",
    run: () => invalidatedBy("createTask", {}),
    want: [
      "task list",
      "my tasks",
      "task peek",
      "projects ENG",
      "projects OPS",
      "calendar",
      "overview",
    ],
  },
  {
    write: "patchTask",
    run: () => invalidatedBy("patchTask", { key: "ENG-1", parentId: null }),
    want: [
      "task list",
      "my tasks",
      "task peek",
      "projects ENG",
      "projects OPS",
      "task ENG-1",
      "calendar",
      "inbox",
      "overview",
    ],
  },
  {
    write: "patchTask of a subtask",
    run: () =>
      invalidatedBy("patchTask", { key: "ENG-1", parentId: "id-ENG-2" }),
    want: [
      "task list",
      "my tasks",
      "task peek",
      "projects ENG",
      "projects OPS",
      "task ENG-1",
      "task ENG-2",
      "calendar",
      "inbox",
      "overview",
    ],
  },
  {
    write: "comment",
    run: () => invalidatedBy("comment", { key: "ENG-1" }),
    want: ["task ENG-1"],
  },
  {
    write: "react",
    run: () => invalidatedBy("react", { key: "ENG-1" }),
    want: ["task ENG-1"],
  },
  {
    write: "addCollaborator",
    run: () => invalidatedBy("addCollaborator", { key: "ENG-1" }),
    want: ["task list", "my tasks", "task peek", "task ENG-1"],
  },
  {
    write: "removeCollaborator",
    run: () => invalidatedBy("removeCollaborator", { key: "ENG-1" }),
    want: ["task list", "my tasks", "task peek", "task ENG-1"],
  },
  {
    write: "createProject",
    run: () => invalidatedBy("createProject", { team: "ENG" }),
    want: ["projects ENG"],
  },
  {
    write: "patchProject",
    run: () => invalidatedBy("patchProject", { team: "ENG" }),
    want: ["projects ENG", "task list", "my tasks", "task peek"],
  },
  {
    write: "createTeam",
    run: () => invalidatedBy("createTeam", {}),
    want: ["teams", "me", "overview"],
  },
  {
    write: "patchTeam",
    run: () => invalidatedBy("patchTeam", { team: "ENG" }),
    want: ["teams", "team ENG", "me"],
  },
  {
    write: "setMember",
    run: () => invalidatedBy("setMember", { team: "ENG" }),
    want: ["teams", "team ENG", "me"],
  },
  {
    write: "removeMember",
    run: () => invalidatedBy("removeMember", { team: "ENG" }),
    want: ["teams", "team ENG", "me"],
  },
  {
    write: "createLabel",
    run: () => invalidatedBy("createLabel", {}),
    want: ["labels"],
  },
  {
    write: "patchMe",
    run: () => invalidatedBy("patchMe", {}),
    want: Object.keys(cached) as Cached[],
  },
];

describe("what a write invalidates", () => {
  for (const { write, run, want } of cases)
    test(write, async () => {
      expect((await run()).sort()).toEqual([...want].sort());
    });

  test("every write has a case", () => {
    const covered = new Set(cases.map((c) => c.write.split(" ")[0]));
    expect([...covered].sort()).toEqual(Object.keys(invalidations).sort());
  });
});
