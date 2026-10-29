import { expect, test } from "bun:test";
import { progress } from "../src/shared/progress";

test("a task without subtasks follows its status", () => {
  expect(progress({ status: "done" }, [])).toBe(1);
  expect(progress({ status: "in_progress" }, [])).toBe(0.5);
  expect(progress({ status: "blocked" }, [])).toBe(0);
});

test("subtasks decide the progress and canceled ones do not count", () => {
  const subtasks = [
    { status: "done" as const },
    { status: "todo" as const },
    { status: "canceled" as const },
  ];
  expect(progress({ status: "todo" }, subtasks)).toBe(0.5);
});
