import type { SessionUser } from "./env";
import { HttpError } from "./http";

export type Role = "leader" | "member" | null;

// SQL that keeps only the tasks `user` may see. `t` is the tasks alias. An open
// task is visible to all. A private one is visible to its owner, creator,
// collaborators, the leaders of its team and admins. Every query that returns
// or counts tasks applies it.
export function visible(
  user: SessionUser,
  t = "t",
): { sql: string; params: unknown[] } {
  return {
    sql: `(${t}.visibility = 'open' OR ? = 1 OR ${t}.owner_id = ? OR ${t}.created_by = ?
      OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = ${t}.id AND tc.user_id = ?)
      OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = ${t}.team_id AND tm.user_id = ? AND tm.role = 'leader'))`,
    params: [user.is_admin, user.id, user.id, user.id, user.id],
  };
}

export async function teamRole(
  db: D1Database,
  user: SessionUser,
  teamId: string,
): Promise<Role> {
  if (user.is_admin) return "leader";
  const row = await db
    .prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?")
    .bind(teamId, user.id)
    .first<{ role: "leader" | "member" }>();
  return row?.role ?? null;
}

export async function requireLeader(
  db: D1Database,
  user: SessionUser,
  teamId: string,
): Promise<void> {
  if ((await teamRole(db, user, teamId)) !== "leader") {
    throw new HttpError(
      403,
      "solo un líder del equipo o un admin puede hacer esto",
    );
  }
}

export function requireAdmin(user: SessionUser): void {
  if (!user.is_admin)
    throw new HttpError(403, "solo un admin puede hacer esto");
}
