import { id } from "../http";
import type { LinkSpec } from "./events";
import {
  insertLinkUpdate,
  linkState,
  taskIdByKey,
  upsertLink,
} from "./queries";

async function firstTaskId(db: D1Database, keys: string[]) {
  for (const key of keys) {
    const taskId = await taskIdByKey(db, key);
    if (taskId) return taskId;
  }
  return null;
}

// Links the object to the first task its texts name. A change of state is
// written to the task's activity. Returns false when no named task exists.
export async function applyLink(db: D1Database, spec: LinkSpec) {
  const taskId = await firstTaskId(db, spec.keys);
  if (!taskId) return false;
  const before = await linkState(db, spec);
  await upsertLink(db, id(), taskId, spec);
  if (spec.kind !== "commit" && before !== spec.state) {
    await insertLinkUpdate(
      db,
      id(),
      taskId,
      `${spec.kind.replace("_", " ")} ${spec.state}: ${spec.title}`,
      { url: spec.url, repo: spec.repo, state: spec.state },
    );
  }
  return true;
}
