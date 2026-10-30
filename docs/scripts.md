# One-time scripts

A one-time script changes data once in one environment: it creates the org's
teams, imports a list, or fixes rows a bug left behind. It is not part of the
schema, so it does not live in `migrations/`, which every environment and every
test applies.

## Layout

Each script is one SQL file in `scripts/once/`, named `YYYY-MM-DD-slug.sql`. The
file stays in the repository after it runs, as the record of what changed and
why.

## Running

```
bun run once scripts/once/2026-10-30-aiplaygrounds-teams.sql           # local D1
bun run once scripts/once/2026-10-30-aiplaygrounds-teams.sql --remote  # production
```

The runner checks the `script_runs` table, refuses a script that already ran in
that environment, and otherwise runs the file with a row for it in
`script_runs`. `--remote` needs the remote migrations applied first; a deploy
applies them.

## Writing a script

- Write it so a second run changes nothing: `INSERT OR IGNORE`, and `UPDATE`
  with a `WHERE` that matches the target rows. A remote run that fails partway
  leaves its earlier statements applied, and the fix is to run it again.
- Never put a secret in a script; the repository is the record. A real email
  belongs in a script only if `ALLOWED_EMAILS` in `wrangler.jsonc` already lists
  it. A fictional person uses the reserved `example.test` domain, which no
  Google account has.
- Start the file with `-- after: <migration file>`, the last migration the
  target environment had when the script ran. A later migration may drop a
  column the script writes, and the header keeps the script testable.
- `tests/once-scripts.test.ts` replays production order: migrations up to each
  script's `after`, the script twice, then the remaining migrations on its rows.
  A script that fails there fails the check.
