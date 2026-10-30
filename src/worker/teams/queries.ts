import type { Member, Team } from "../../shared/types";

export type TeamRow = Omit<Team, "members">;

export function findTeam(db: D1Database, key: string) {
  return db
    .prepare("SELECT id, key, name FROM teams WHERE key = ?")
    .bind(key.toUpperCase())
    .first<TeamRow>();
}

export function findTeamWithCount(db: D1Database, key: string) {
  return db
    .prepare(
      `SELECT t.id, t.key, t.name,
         (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) AS members
       FROM teams t WHERE t.key = ?`,
    )
    .bind(key.toUpperCase())
    .first<Team>();
}

export async function listTeams(db: D1Database): Promise<Team[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.key, t.name,
         (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) AS members
       FROM teams t ORDER BY t.name`,
    )
    .all<Team>();
  return results;
}

export async function listMembers(
  db: D1Database,
  teamId: string,
): Promise<Member[]> {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.avatar_url, m.role FROM team_members m
       JOIN users u ON u.id = m.user_id WHERE m.team_id = ?
       ORDER BY m.role = 'leader' DESC, u.name`,
    )
    .bind(teamId)
    .all<Member>();
  return results;
}

// False when the key is taken or a leader does not exist.
export async function insertTeam(
  db: D1Database,
  team: { id: string; key: string; name: string },
  leaders: string[],
): Promise<boolean> {
  try {
    await db.batch([
      db
        .prepare("INSERT INTO teams (id, key, name) VALUES (?, ?, ?)")
        .bind(team.id, team.key, team.name),
      ...leaders.map((userId) =>
        db
          .prepare(
            "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'leader')",
          )
          .bind(team.id, userId),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function updateTeam(
  db: D1Database,
  teamId: string,
  name: string,
): Promise<void> {
  await db
    .prepare("UPDATE teams SET name = ? WHERE id = ?")
    .bind(name, teamId)
    .run();
}

// False when the user does not exist.
export async function upsertMember(
  db: D1Database,
  teamId: string,
  userId: string,
  role: "leader" | "member",
): Promise<boolean> {
  try {
    await db
      .prepare(
        `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = excluded.role`,
      )
      .bind(teamId, userId, role)
      .run();
    return true;
  } catch {
    return false;
  }
}

export async function deleteMember(
  db: D1Database,
  teamId: string,
  userId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?")
    .bind(teamId, userId)
    .run();
}

// True when `userId` leads the team and nobody else does.
export async function isLastLeader(
  db: D1Database,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(user_id = ?), 0) AS self, COUNT(*) AS leaders
       FROM team_members WHERE team_id = ? AND role = 'leader'`,
    )
    .bind(userId, teamId)
    .first<{ self: number; leaders: number }>();
  return row?.self === 1 && row.leaders === 1;
}

export async function isTeamLeader(
  db: D1Database,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS yes FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'leader'",
    )
    .bind(teamId, userId)
    .first();
  return row !== null;
}

export async function countTeams(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS teams FROM teams")
    .first<{ teams: number }>();
  return row?.teams ?? 0;
}
