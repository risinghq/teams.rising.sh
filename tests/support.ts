import { readdirSync, readFileSync } from "node:fs";
import { Miniflare } from "miniflare";

// Every D1 call goes through Miniflare's worker process, so a request costs
// tens of milliseconds and a test of a few dozen requests outgrows the 5 s
// default on a loaded host. Bun resets the default per file, so each file that
// uses Miniflare calls `setDefaultTimeout(HOST_TIMEOUT)`.
export const HOST_TIMEOUT = 30_000;

// A Miniflare D1 database with every migration applied. One batch keeps the
// setup well inside the hook timeout.
export async function migratedDb(name: string) {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('') } }",
    d1Databases: { DB: name },
  });
  const DB = await mf.getD1Database("DB");
  const dir = new URL("../migrations/", import.meta.url);
  const statements: string[] = [];
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    for (const statement of sql.split(/;\s*\n/)) {
      const clean = statement.replace(/^--.*$/gm, "").trim();
      if (clean) statements.push(clean);
    }
  }
  await DB.batch(statements.map((s) => DB.prepare(s)));
  return { mf, DB };
}
