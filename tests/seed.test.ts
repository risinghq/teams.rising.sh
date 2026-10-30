import { afterAll, beforeAll, expect, test, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import type { Miniflare } from "miniflare";
import { HOST_TIMEOUT, migratedDb, sqlStatements } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let DB: D1Database;

beforeAll(async () => {
  ({ mf, DB } = await migratedDb("seed"));
});

afterAll(() => mf.dispose());

test("the dev seed applies on the current schema", async () => {
  const sql = readFileSync(
    new URL("../seeds/dev.sql", import.meta.url),
    "utf8",
  );
  await DB.batch(sqlStatements(sql).map((s) => DB.prepare(s)));
  const tasks = await DB.prepare("SELECT COUNT(*) AS n FROM tasks").first<{
    n: number;
  }>();
  expect(tasks?.n).toBe(20);
});
