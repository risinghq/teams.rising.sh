import { afterAll, beforeAll, expect, test, setDefaultTimeout } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import type { Miniflare } from "miniflare";
import {
  applyMigrations,
  emptyDb,
  HOST_TIMEOUT,
  migrationFiles,
  sqlStatements,
} from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let DB: D1Database;

const dir = new URL("../scripts/once/", import.meta.url);

const scripts = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => {
    const sql = readFileSync(new URL(file, dir), "utf8");
    return { file, sql, after: /^-- after: (\S+)$/m.exec(sql)?.[1] };
  });

beforeAll(async () => {
  ({ mf, DB } = await emptyDb("once"));
});

afterAll(() => mf.dispose());

const run = (sql: string) =>
  DB.batch(sqlStatements(sql).map((s) => DB.prepare(s)));

test("every one-time script names a migration that exists", () => {
  const migrations = migrationFiles();
  for (const { file, after } of scripts)
    expect({ file, after: migrations.includes(after ?? "") }).toEqual({
      file,
      after: true,
    });
});

// Production runs each script between the migrations around it, and later
// migrations then run on its rows. The runner refuses a second run, but a run
// that fails halfway on --remote leaves its first statements applied, so every
// script must survive a rerun.
test("scripts apply twice in production order and later migrations run on their rows", async () => {
  const pending = migrationFiles();
  const migrateThrough = (last: string) =>
    applyMigrations(DB, pending.splice(0, pending.indexOf(last) + 1));
  await migrateThrough(scripts[0]!.after!);
  // Production state before the scripts: one team and one signed-in user.
  await run(`
    INSERT INTO teams (id, key, name) VALUES ('t-ais', 'AIS', 'AI for Science');
    INSERT INTO users (id, email, name, is_admin) VALUES ('u-signed-in', 'dadch1404@gmail.com', 'David', 1);
  `);
  for (const { sql, after } of scripts) {
    await migrateThrough(after!);
    await run(sql);
    await run(sql);
  }
  await applyMigrations(DB, pending);
});

test("the AI PlayGrounds script keeps the existing team and adds the rest", async () => {
  const { results } = await DB.prepare(
    "SELECT id, key FROM teams ORDER BY key",
  ).all<{ id: string; key: string }>();
  expect(results).toContainEqual({ id: "t-ais", key: "AIS" });
  expect(results.map((t) => t.key)).toEqual([
    "ACAD",
    "AIF",
    "AIFIN",
    "AIS",
    "AISW",
    "COM",
    "LABS",
  ]);
});

test("the demo script gives the signed-in user work and adds no second David", async () => {
  const users = await DB.prepare(
    "SELECT email, is_admin FROM users WHERE email LIKE '%@gmail.com' ORDER BY email",
  ).all<{ email: string; is_admin: number }>();
  expect(users.results).toEqual([
    { email: "dadch1404@gmail.com", is_admin: 1 },
    { email: "pedro.rojas.f24@gmail.com", is_admin: 1 },
  ]);
  const david = await DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM team_members WHERE user_id = 'u-signed-in') AS teams,
       (SELECT COUNT(*) FROM tasks WHERE owner_id = 'u-signed-in'
          AND status NOT IN ('done', 'canceled')) AS open`,
  ).first<{ teams: number; open: number }>();
  expect(david).toEqual({ teams: 4, open: 6 });
  const fictional = await DB.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE email LIKE '%@example.test'",
  ).first<{ n: number }>();
  expect(fictional?.n).toBe(8);
});
