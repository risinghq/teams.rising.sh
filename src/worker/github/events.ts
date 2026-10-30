export type LinkSpec = {
  kind: "pull_request" | "issue" | "branch" | "commit";
  repo: string;
  externalId: string;
  url: string;
  title: string;
  state: string;
  keys: string[];
};

type Json = Record<string, any>;

const KEY = /\b([A-Z][A-Z0-9]{1,9})-(\d+)\b/g;

// Task keys named in the texts, in order of first appearance, without repeats.
export function taskKeys(...texts: (string | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const t of texts) {
    for (const m of (t ?? "").matchAll(KEY)) found.add(m[0]);
  }
  return [...found];
}

// Splits a task key such as `ENG-12` into its team key and number.
export function splitKey(key: string): { team: string; number: number } {
  const dash = key.lastIndexOf("-");
  return { team: key.slice(0, dash), number: Number(key.slice(dash + 1)) };
}

// The git objects an event names. Events that carry no linkable object give [].
export function linksFromEvent(event: string, p: Json): LinkSpec[] {
  const repo: string = p.repository?.full_name ?? "";
  if (event === "pull_request" && p.pull_request) {
    const pr = p.pull_request;
    return [
      {
        kind: "pull_request",
        repo,
        externalId: String(pr.number),
        url: pr.html_url,
        title: pr.title,
        state: pr.merged ? "merged" : pr.state,
        keys: taskKeys(pr.title, pr.head?.ref, pr.body),
      },
    ];
  }
  if (event === "issues" && p.issue) {
    const issue = p.issue;
    return [
      {
        kind: "issue",
        repo,
        externalId: String(issue.number),
        url: issue.html_url,
        title: issue.title,
        state: issue.state,
        keys: taskKeys(issue.title, issue.body),
      },
    ];
  }
  if (event === "push" && !p.deleted) {
    const specs: LinkSpec[] = [];
    const branch = String(p.ref ?? "").replace(/^refs\/heads\//, "");
    const branchKeys = taskKeys(branch);
    if (p.ref?.startsWith("refs/heads/") && branchKeys.length > 0) {
      specs.push({
        kind: "branch",
        repo,
        externalId: branch,
        url: `${p.repository.html_url}/tree/${branch}`,
        title: branch,
        state: "open",
        keys: branchKeys,
      });
    }
    for (const c of p.commits ?? []) {
      const keys = taskKeys(c.message);
      if (keys.length === 0) continue;
      specs.push({
        kind: "commit",
        repo,
        externalId: c.id,
        url: c.url,
        title: String(c.message).split("\n")[0] ?? "",
        state: "open",
        keys,
      });
    }
    return specs;
  }
  return [];
}
