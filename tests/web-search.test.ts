import { describe, expect, test } from "bun:test";
import { parseCalendarSearch } from "../src/web/features/calendar/search";
import {
  parseMyWorkSearch,
  parseTeamSearch,
} from "../src/web/features/tasks/search";

type Raw = Record<string, unknown>;

describe("team page search", () => {
  const cases: { name: string; raw: Raw; want: Raw }[] = [
    { name: "empty URL is the default view", raw: {}, want: {} },
    {
      name: "valid filters are kept",
      raw: {
        status: "in_progress",
        owner: "u1",
        label: "l1",
        project: "p1",
        q: "paper",
        view: "board",
        task: "AIS-3",
      },
      want: {
        status: "in_progress",
        owner: "u1",
        label: "l1",
        project: "p1",
        q: "paper",
        view: "board",
        task: "AIS-3",
      },
    },
    {
      name: "the list view is the default, so it is dropped",
      raw: { view: "list" },
      want: {},
    },
    {
      name: "an unknown status is dropped",
      raw: { status: "archived", q: "x" },
      want: { q: "x" },
    },
    {
      name: "an unknown view is dropped",
      raw: { view: "grid" },
      want: {},
    },
    {
      name: "blank text is dropped and text is trimmed",
      raw: { q: "   ", owner: "", label: " l1 " },
      want: { label: "l1" },
    },
    {
      name: "a value the router parsed as a number counts as text",
      raw: { q: 123, project: 7 },
      want: { q: "123", project: "7" },
    },
    {
      name: "a value of the wrong shape is dropped",
      raw: { owner: { id: "u1" }, label: ["l1"], q: true },
      want: {},
    },
    {
      name: "params from other routes are dropped",
      raw: { mode: "week", date: "2026-10-01" },
      want: {},
    },
  ];
  for (const { name, raw, want } of cases)
    test(name, () => expect(parseTeamSearch(raw)).toEqual(want));
});

describe("Mi trabajo search", () => {
  test("keeps the shared filters and drops the team-only ones", () => {
    expect(
      parseMyWorkSearch({
        status: "todo",
        owner: "u1",
        project: "p1",
        view: "board",
      }),
    ).toEqual({ status: "todo", view: "board" });
  });
});

describe("calendar search", () => {
  const today = "2026-10-30";
  const cases: { name: string; raw: Raw; want: Raw }[] = [
    { name: "empty URL is the month of today", raw: {}, want: {} },
    {
      name: "week mode and another day are kept",
      raw: { mode: "week", date: "2026-11-02", task: "AIS-3" },
      want: { mode: "week", date: "2026-11-02", task: "AIS-3" },
    },
    {
      name: "month is the default, so it is dropped",
      raw: { mode: "month" },
      want: {},
    },
    {
      name: "today is the default anchor, so it is dropped",
      raw: { date: today },
      want: {},
    },
    {
      name: "a malformed date is dropped",
      raw: { date: "30/10/2026" },
      want: {},
    },
    {
      name: "a date that does not exist is dropped",
      raw: { date: "2026-02-31" },
      want: {},
    },
    {
      name: "a date the router parsed as a number is dropped",
      raw: { date: 20261030 },
      want: {},
    },
  ];
  for (const { name, raw, want } of cases)
    test(name, () => expect(parseCalendarSearch(raw, today)).toEqual(want));
});
