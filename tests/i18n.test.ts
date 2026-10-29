import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ES, t } from "../src/web/i18n";

const dir = join(import.meta.dir, "../src/web");

describe("t", () => {
  test("translates and fills placeholders", () => {
    expect(t("{n} open", { n: 3 }, "es")).toBe("3 abiertas");
    expect(t("{n} open", { n: 3 }, "en")).toBe("3 open");
  });
  test("falls back to the English text", () => {
    expect(t("not a known string", undefined, "es")).toBe("not a known string");
  });
});

describe("Spanish", () => {
  test("covers every literal string the interface passes to t", () => {
    const missing = readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f) && f !== "i18n.ts")
      .flatMap((f) =>
        [
          ...readFileSync(join(dir, f), "utf8").matchAll(
            /\bt(?:r)?\(\s*"((?:[^"\\]|\\.)+)"/g,
          ),
        ].map((m) => m[1] as string),
      )
      .filter((s) => !(s in ES));
    expect(missing).toEqual([]);
  });
  test("covers the values passed to t at runtime", () => {
    const dynamic = [
      // project status, link state, palette kind, calendar range
      ...["active", "done", "archived", "open", "closed", "merged"],
      ...["task", "team", "screen", "month", "week"],
      ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ];
    expect(dynamic.filter((s) => !(s in ES))).toEqual([]);
  });
});
