// Runs a one-time data script from scripts/once/ and records it in
// script_runs, so each environment runs it at most once. See docs/scripts.md.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const NAME = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

function d1(target: string, args: string[]) {
  const run = Bun.spawnSync(
    ["bunx", "wrangler", "d1", "execute", "teams", target, "--json", ...args],
    { stderr: "inherit" },
  );
  if (run.exitCode !== 0) throw new Error(`wrangler exited ${run.exitCode}`);
  return run.stdout.toString();
}

function query(target: string, sql: string) {
  return JSON.parse(d1(target, ["--command", sql])) as { results: unknown[] }[];
}

const [file, target = "--local"] = process.argv.slice(2);
if (!file || !["--local", "--remote"].includes(target)) {
  console.error(
    "usage: bun run once scripts/once/<name>.sql [--local|--remote]",
  );
  process.exit(2);
}
const name = basename(file, ".sql");
if (!NAME.test(name)) {
  console.error(`${name}: name must be YYYY-MM-DD-slug`);
  process.exit(2);
}

// The name pattern admits no quote, so it is safe inside the SQL literal.
const ran = query(
  target,
  `SELECT ran_at FROM script_runs WHERE name = '${name}'`,
);
const previous = ran[0]?.results[0] as { ran_at: string } | undefined;
if (previous) {
  console.error(
    `${name} already ran on ${target.slice(2)} at ${previous.ran_at}`,
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "once-"));
try {
  const batch = join(dir, `${name}.sql`);
  writeFileSync(
    batch,
    `${readFileSync(file, "utf8")}\nINSERT INTO script_runs (name) VALUES ('${name}');\n`,
  );
  // A remote --file run prints upload progress to stdout ahead of the JSON,
  // so only the exit code is trusted here.
  d1(target, ["--file", batch]);
  console.log(`${name} ran on ${target.slice(2)}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
