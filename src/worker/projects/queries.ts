import { visible } from "../access";
import type { SessionUser } from "../env";
import type { Project, ProjectCounts } from "../../shared/types";

export type ProjectRow = Omit<Project, keyof ProjectCounts> & {
  start_date: string | null;
  created_at: string;
};

export function findProject(db: D1Database, projectId: string) {
  return db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .bind(projectId)
    .first<ProjectRow>();
}

// Counts cover only the tasks `user` may see. A project with no live task has
// progress 0.
export async function listProjects(
  db: D1Database,
  user: SessionUser,
  teamId: string,
): Promise<(ProjectRow & ProjectCounts)[]> {
  const v = visible(user);
  const { results } = await db
    .prepare(
      `SELECT p.*,
         COUNT(CASE WHEN t.status NOT IN ('done', 'canceled') THEN 1 END) AS open,
         COALESCE(
           1.0 * COUNT(CASE WHEN t.status = 'done' THEN 1 END)
             / NULLIF(COUNT(CASE WHEN t.status != 'canceled' THEN 1 END), 0),
           0) AS progress,
         MIN(CASE WHEN t.status NOT IN ('done', 'canceled') THEN t.due_date END) AS next_due
       FROM projects p LEFT JOIN tasks t ON t.project_id = p.id AND ${v.sql}
       WHERE p.team_id = ? GROUP BY p.id ORDER BY p.status, p.name`,
    )
    .bind(...v.params, teamId)
    .all<ProjectRow & ProjectCounts>();
  return results;
}

export async function insertProject(
  db: D1Database,
  project: {
    id: string;
    team_id: string;
    name: string;
    description: string;
    start_date: string | null;
    target_date: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO projects (id, team_id, name, description, start_date, target_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      project.id,
      project.team_id,
      project.name,
      project.description,
      project.start_date,
      project.target_date,
    )
    .run();
}

export async function updateProject(
  db: D1Database,
  project: Pick<
    ProjectRow,
    "id" | "name" | "description" | "status" | "start_date" | "target_date"
  >,
): Promise<void> {
  await db
    .prepare(
      "UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, target_date = ? WHERE id = ?",
    )
    .bind(
      project.name,
      project.description,
      project.status,
      project.start_date,
      project.target_date,
      project.id,
    )
    .run();
}
