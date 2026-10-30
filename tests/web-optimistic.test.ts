import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { Me, Person, Task, TaskDetail, Update } from "@shared/types";
import {
  applyPatches,
  isPending,
  pendingComment,
  reaction,
  taskPatch,
  type Read,
} from "../src/web/lib/optimistic";
import { queryKeys as k } from "../src/web/lib/query-keys";

const ana: Person = { id: "u1", name: "Ana", avatar_url: null };
const beto: Person = { id: "u2", name: "Beto", avatar_url: null };

const task = (key: string, extra: Partial<Task> = {}) =>
  ({
    key,
    title: key,
    status: "todo",
    owner: null,
    labels: [],
    ...extra,
  }) as Task;

const update = (id: string, extra: Partial<Update> = {}) =>
  ({ id, kind: "comment", body: "", reactions: [], ...extra }) as Update;

const detail = (key: string, extra: Partial<TaskDetail> = {}) =>
  ({ ...task(key), subtasks: [], updates: [], ...extra }) as TaskDetail;

function cache() {
  const client = new QueryClient();
  client.setQueryData(k.me, { id: ana.id, name: ana.name } as Me);
  client.setQueryData(k.users, [ana, beto]);
  return client;
}

const reader =
  (client: QueryClient): Read =>
  (key) =>
    client.getQueryData(key);

describe("taskPatch", () => {
  test("changes every cached copy of the task and only that task", async () => {
    const client = cache();
    const list = k.tasks.list({ team: "ENG" });
    const peek = k.tasks.peek({ q: "x", limit: "5" });
    const range = k.calendar.range("2026-10-01", "2026-11-01");
    client.setQueryData(
      k.tasks.detail("ENG-9"),
      detail("ENG-9", {
        subtasks: [task("ENG-1"), task("ENG-2")],
      }),
    );
    client.setQueryData(list, {
      pages: [{ items: [task("ENG-1"), task("ENG-3")], next: null }],
      pageParams: [undefined],
    });
    client.setQueryData(peek, { items: [task("ENG-1")], next: null });
    client.setQueryData(range, { tasks: [task("ENG-1")], events: [] });

    await applyPatches(
      client,
      taskPatch(
        { key: "ENG-1", patch: { status: "done", owner_id: beto.id } },
        reader(client),
      ),
    );

    const sub = client.getQueryData<TaskDetail>(k.tasks.detail("ENG-9"))!;
    expect(sub.subtasks.map((t) => t.status)).toEqual(["done", "todo"]);
    expect(sub.subtasks[0]?.owner).toEqual(beto);
    const pages = client.getQueryData<{ pages: { items: Task[] }[] }>(list)!;
    expect(pages.pages[0]?.items.map((t) => t.status)).toEqual([
      "done",
      "todo",
    ]);
    expect(client.getQueryData<{ items: Task[] }>(peek)!.items[0]?.status).toBe(
      "done",
    );
    expect(
      client.getQueryData<{ tasks: Task[] }>(range)!.tasks[0]?.status,
    ).toBe("done");
  });

  test("undo puts back what the cache held before", async () => {
    const client = cache();
    const key = k.tasks.detail("ENG-1");
    const before = detail("ENG-1");
    client.setQueryData(key, before);
    const undo = await applyPatches(
      client,
      taskPatch({ key: "ENG-1", patch: { title: "Nuevo" } }, reader(client)),
    );
    expect(client.getQueryData<TaskDetail>(key)?.title).toBe("Nuevo");
    undo();
    expect(client.getQueryData(key)).toEqual(before);
  });

  test("leaves a query that has not loaded unloaded", async () => {
    const client = cache();
    const key = k.tasks.list({ team: "ENG" });
    await client.prefetchQuery({
      queryKey: key,
      queryFn: () => Promise.reject(new Error("x")),
      retry: false,
    });
    await applyPatches(
      client,
      taskPatch({ key: "ENG-1", patch: { title: "Nuevo" } }, reader(client)),
    );
    expect(client.getQueryData(key)).toBeUndefined();
  });
});

describe("reaction", () => {
  const run = async (
    reactions: Update["reactions"],
    emoji: string,
    on: boolean,
  ) => {
    const client = cache();
    const key = k.tasks.detail("ENG-1");
    client.setQueryData(
      key,
      detail("ENG-1", { updates: [update("c1", { reactions })] }),
    );
    await applyPatches(
      client,
      reaction({ key: "ENG-1", updateId: "c1", emoji, on }, reader(client)),
    );
    return client.getQueryData<TaskDetail>(key)!.updates[0]!.reactions;
  };

  test("adds me to an emoji others used", async () => {
    expect(
      await run([{ emoji: "👍", names: ["Beto"], mine: false }], "👍", true),
    ).toEqual([{ emoji: "👍", names: ["Beto", "Ana"], mine: true }]);
  });

  test("taking back the last one removes the emoji", async () => {
    expect(
      await run([{ emoji: "🎉", names: ["Ana"], mine: true }], "🎉", false),
    ).toEqual([]);
  });

  test("a repeated click changes nothing", async () => {
    const mine = [{ emoji: "👍", names: ["Ana"], mine: true }];
    expect(await run(mine, "👍", true)).toEqual(mine);
  });
});

test("a comment shows at once as pending, by me", async () => {
  const client = cache();
  const key = k.tasks.detail("ENG-1");
  client.setQueryData(key, detail("ENG-1", { updates: [update("c1")] }));
  await applyPatches(
    client,
    pendingComment({ key: "ENG-1", body: "hola" }, reader(client)),
  );
  const [old, mine] = client.getQueryData<TaskDetail>(key)!.updates;
  expect(isPending(old!)).toBe(false);
  expect(isPending(mine!)).toBe(true);
  expect(mine).toMatchObject({ body: "hola", author_name: "Ana" });
});
