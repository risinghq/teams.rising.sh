import { afterAll, beforeAll, expect, setDefaultTimeout, test } from "bun:test";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import type { Miniflare } from "miniflare";
import { taskPagesOptions } from "../src/web/features/tasks/hooks";
import { invalidateAfter } from "../src/web/lib/invalidation";
import app from "../src/worker/index";
import { HOST_TIMEOUT, migratedDb } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let env: Record<string, unknown>;
let cookie = "";
const realFetch = globalThis.fetch;

// The web client's `fetch` goes to the real worker, signed in as one person.
beforeAll(async () => {
  const started = await migratedDb("paging");
  mf = started.mf;
  env = {
    DB: started.DB,
    ASSETS: { fetch: () => new Response("asset") },
    DEV_LOGIN: "1",
  };
  const login = await app.request(
    "/api/auth/dev",
    { method: "POST", body: JSON.stringify({ email: "ana@x.test" }) },
    env,
  );
  cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  globalThis.fetch = ((path: string, init: RequestInit = {}) =>
    app.request(
      path,
      { ...init, headers: { ...init.headers, cookie } },
      env,
    )) as unknown as typeof fetch;
  await call("POST", "/api/teams", { key: "PAG", name: "Paging" });
  for (const i of [1, 2, 3, 4, 5])
    await call("POST", "/api/tasks", { team: "PAG", title: `task ${i}` });
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await mf.dispose();
});

const call = async (method: string, path: string, json?: unknown) => {
  const res = await fetch(path, {
    method,
    headers: json === undefined ? {} : { "content-type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  expect(res.status).toBe(method === "POST" ? 201 : 200);
};

// Resolves with the observer's result once `done` accepts it.
const settled = <R>(
  observer: { subscribe: (listener: (r: R) => void) => () => void },
  done: (r: R) => boolean,
) =>
  new Promise<R>((resolve) => {
    const stop = observer.subscribe((r) => {
      if (done(r)) {
        stop();
        resolve(r);
      }
    });
  });

test("a paged list loads its next page and a write refreshes every loaded page", async () => {
  const client = new QueryClient();
  const observer = new InfiniteQueryObserver(
    client,
    taskPagesOptions({ team: "PAG", top: "1" }, 2),
  );
  const keys = (r: { data?: { pages: { items: { key: string }[] }[] } }) =>
    r.data?.pages.flatMap((p) => p.items.map((t) => t.key)) ?? [];

  const first = await settled(
    observer,
    (r) => r.isSuccess && !r.isFetchingNextPage,
  );
  expect(first.data?.pages).toHaveLength(1);
  expect(first.hasNextPage).toBe(true);
  expect(keys(first)).toHaveLength(2);

  const second = await observer.fetchNextPage();
  expect(second.data?.pages).toHaveLength(2);
  expect(keys(second)).toHaveLength(4);
  expect(new Set(keys(second)).size).toBe(4);

  await call("POST", "/api/tasks", { team: "PAG", title: "late" });
  const refreshed = settled(
    observer,
    (r) => r.dataUpdatedAt > second.dataUpdatedAt && !r.isFetching,
  );
  await invalidateAfter(client, "createTask", {});
  const after = await refreshed;
  // Every page loaded so far is fetched again, not only the first.
  expect(after.data?.pages).toHaveLength(2);
  expect(after.hasNextPage).toBe(true);

  let last = after;
  while (last.hasNextPage) last = await observer.fetchNextPage();
  expect(keys(last)).toHaveLength(6);
  expect(
    last.data?.pages.flatMap((p) => p.items.map((t) => t.title)),
  ).toContain("late");
  observer.destroy();
});
