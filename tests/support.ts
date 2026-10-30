import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";

// Every D1 call goes through Miniflare's worker process, so a request costs
// tens of milliseconds and a test of a few dozen requests outgrows the 5 s
// default on a loaded host. Bun resets the default per file, so each file that
// uses Miniflare calls `setDefaultTimeout(HOST_TIMEOUT)`.
export const HOST_TIMEOUT = 30_000;

const migrationsDir = new URL("../migrations/", import.meta.url);

export const migrationFiles = () => readdirSync(migrationsDir).sort();

export const sqlStatements = (sql: string) =>
  sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^--.*$/gm, "").trim())
    .filter(Boolean);

// One batch keeps the setup well inside the hook timeout.
export async function applyMigrations(DB: D1Database, files: string[]) {
  const statements = files.flatMap((file) =>
    sqlStatements(readFileSync(new URL(file, migrationsDir), "utf8")),
  );
  if (statements.length) await DB.batch(statements.map((s) => DB.prepare(s)));
}

export async function emptyDb(name: string) {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('') } }",
    d1Databases: { DB: name },
    r2Buckets: ["FILES"],
  });
  return { mf, DB: await mf.getD1Database("DB") };
}

// A Miniflare D1 database with every migration applied.
export async function migratedDb(name: string) {
  const db = await emptyDb(name);
  await applyMigrations(db.DB, migrationFiles());
  return db;
}
