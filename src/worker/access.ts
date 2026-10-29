import type { User } from "./env";
import { HttpError, type C } from "./http";

export type Role = "leader" | "member" | null;

// SQL that keeps only the tasks `user` may see. `t` is the tasks alias. An open
// task is visible to all. A private one is visible to its owner, creator,
// collaborators, the leaders of its team and admins.
export function visible(
  user: User,
  t = "t",
): { sql: string; params: unknown[] } {
  return {
    sql: `(${t}.visibility = 'open' OR ? = 1 OR ${t}.owner_id = ? OR ${t}.created_by = ?
      OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = ${t}.id AND tc.user_id = ?)
      OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = ${t}.team_id AND tm.user_id = ? AND tm.role = 'leader'))`,
    params: [user.is_admin, user.id, user.id, user.id, user.id],
  };
}

export async function teamRole(c: C, teamId: string): Promise<Role> {
  const user = c.get("user");
  if (user.is_admin) return "leader";
  const row = await c.env.DB.prepare(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
  )
    .bind(teamId, user.id)
    .first<{ role: "leader" | "member" }>();
  return row?.role ?? null;
}

export async function requireLeader(c: C, teamId: string): Promise<void> {
  if ((await teamRole(c, teamId)) !== "leader") {
    throw new HttpError(403, "only a team leader or an admin can do this");
  }
}

export function requireAdmin(c: C): void {
  if (!c.get("user").is_admin)
    throw new HttpError(403, "only an admin can do this");
}
