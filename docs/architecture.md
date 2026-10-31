# Architecture

`src` holds three programs that share one folder: `shared`, `worker` and `web`.
[fallow](https://fallow.tools) checks the imports between them. The rules live
in `.fallowrc.json` and run in `bun run check` and in CI.

## Layers

An arrow means "may import".

```
worker ──► shared
web:
  app ──► features ──► ui ──► lib ──► shared
```

| Zone       | Path                                             | Imports               |
| ---------- | ------------------------------------------------ | --------------------- |
| `shared`   | `src/shared`                                     | nothing               |
| `worker`   | `src/worker`                                     | `shared`              |
| `lib`      | `src/web/lib`, `src/web/hooks`, `src/web/api.ts` | `shared`              |
| `ui`       | `src/web/ui`                                     | `shared`, `lib`       |
| `features` | `src/web/features`                               | `shared`, `lib`, `ui` |
| `app`      | `src/web/app`, `src/web/main.tsx`                | every web zone        |

`worker` and `web` never import each other. A type or a schema both sides need
goes in `shared`. `lib` sits under `ui` because every primitive uses `cn`.

## Checks

`bun run arch` runs two commands:

- `fallow architecture` fails on a zone import the table forbids and on an
  import cycle.
- `fallow dead-code` fails on an unused file, export, type or dependency.
  Exports under `src/web/ui` are exempt: that folder is the component kit.

Fix a finding by moving the code to the right zone or by deleting it. Use
`// fallow-ignore-next-line` only for an export that something outside the graph
uses, and say why in the same comment.
