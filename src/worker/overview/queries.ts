import type { OverviewRow } from "../../shared/types";
import { visible } from "../access";
import type { SessionUser } from "../env";

const COUNTS = `COUNT(CASE WHEN t.status NOT IN ('done', 'canceled') THEN 1 END) AS open,
  COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) AS blocked,
  COUNT(CASE WHEN t.status NOT IN ('done', 'canceled') AND t.due_date < ? THEN 1 END) AS overdue,
  COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS done`;

// Counts cover the tasks `user` may see. `today` is YYYY-MM-DD.
export async function overview(
  db: D1Database,
  user: SessionUser,
  today: string,
): Promise<{ teams: OverviewRow[]; owners: OverviewRow[] }> {
  const v = visible(user);
  const [teams, owners] = await Promise.all([
    db
      .prepare(
        `SELECT tm.key, tm.name, ${COUNTS} FROM teams tm
         LEFT JOIN tasks t ON t.team_id = tm.id AND ${v.sql} GROUP BY tm.id ORDER BY tm.key`,
      )
      .bind(today, ...v.params)
      .all<OverviewRow>(),
    db
      .prepare(
        `SELECT u.id, u.name, u.avatar_url, ${COUNTS} FROM users u
         JOIN tasks t ON t.owner_id = u.id AND ${v.sql} GROUP BY u.id ORDER BY open DESC, u.name`,
      )
      .bind(today, ...v.params)
      .all<OverviewRow>(),
  ]);
  return { teams: teams.results, owners: owners.results };
}
