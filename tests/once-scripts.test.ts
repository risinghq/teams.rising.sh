import { afterAll, beforeAll, expect, test, setDefaultTimeout } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import type { Miniflare } from "miniflare";
import { HOST_TIMEOUT, migratedDb } from "./support";

setDefaultTimeout(HOST_TIMEOUT);

let mf: Miniflare;
let DB: D1Database;

beforeAll(async () => {
  ({ mf, DB } = await migratedDb("once"));
  await DB.prepare(
    "INSERT INTO teams (id, key, name, description) VALUES ('t-ais', 'AIS', 'AI for Science', 'A testing group!')",
  ).run();
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
