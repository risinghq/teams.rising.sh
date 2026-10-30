// Every query key in the app. A key is a prefix of the more specific ones under
// it, so invalidating `tasks.lists` also reaches every `tasks.list(...)`.
export const queryKeys = {
  me: ["me"] as const,
  users: ["users"] as const,
  labels: ["labels"] as const,
  teams: {
    list: ["teams", "list"] as const,
    detail: (team: string) => ["teams", "detail", team] as const,
  },
  projects: {
    all: ["projects"] as const,
    ofTeam: (team: string) => ["projects", team] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    lists: ["tasks", "list"] as const,
    list: (query: Record<string, string>) => ["tasks", "list", query] as const,
    // A single page that is only counted or searched, never paged through.
    peek: (query: Record<string, string>) =>
      ["tasks", "list", "peek", query] as const,
    details: ["tasks", "detail"] as const,
    detail: (key: string) => ["tasks", "detail", key] as const,
  },
  calendar: {
    all: ["calendar"] as const,
    range: (from: string, to: string) => ["calendar", from, to] as const,
  },
  // Not under `calendar`: a patch to the calendar's tasks must not reach it.
  freeBusy: {
    all: ["freebusy"] as const,
    day: (day: string, users: string[]) => ["freebusy", day, users] as const,
  },
  inbox: ["inbox"] as const,
  overview: ["overview"] as const,
};
