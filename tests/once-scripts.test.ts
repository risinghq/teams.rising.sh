import { afterAll, beforeAll, expect, test, setDefaultTimeout } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import type { Miniflare } from "miniflare";
import { HOST_TIMEOUT, migratedDb } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let DB: D1Database;

beforeAll(async () => {
  ({ mf, DB } = await migratedDb("once"));
  // Production state before the scripts: one team and one signed-in user.
  await DB.batch([
    DB.prepare(
      "INSERT INTO teams (id, key, name, description) VALUES ('t-ais', 'AIS', 'AI for Science', 'A testing group!')",
    ),
    DB.prepare(
      "INSERT INTO users (id, email, name, is_admin) VALUES ('u-signed-in', 'dadch1404@gmail.com', 'David', 1)",
    ),
  ]);
});

afterAll(() => mf.dispose());

const dir = new URL("../scripts/once/", import.meta.url);

async function apply(file: string) {
  const sql = readFileSync(new URL(file, dir), "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^--.*$/gm, "").trim())
    .filter(Boolean);
  await DB.batch(statements.map((s) => DB.prepare(s)));
}

// The runner refuses a second run, but a run that fails halfway on --remote
// leaves its first statements applied, so every script must survive a rerun.
test("every one-time script applies twice on a migrated database", async () => {
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await apply(file);
    await apply(file);
  }
});

test("the AI PlayGrounds script keeps the existing team and adds the rest", async () => {
  await apply("2026-10-30-aiplaygrounds-teams.sql");
  const { results } = await DB.prepare(
    "SELECT id, key, description FROM teams ORDER BY key",
  ).all<{ id: string; key: string; description: string }>();
  expect(results.map((t) => t.key)).toEqual([
    "ACAD",
    "AIF",
    "AIFIN",
    "AIS",
    "AISW",
    "COM",
    "LABS",
  ]);
  const ais = results.find((t) => t.key === "AIS");
  expect(ais?.id).toBe("t-ais");
  expect(ais?.description).toStartWith(
    "Cómo la IA aporta al trabajo científico",
  );
});

test("the demo script gives the signed-in user work and adds no second David", async () => {
  await apply("2026-10-30-demo-people-and-work.sql");
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
