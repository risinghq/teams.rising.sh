export type LabelRow = {
  id: string;
  team_id: string | null;
  name: string;
  color: string;
};

export async function listLabels(db: D1Database): Promise<LabelRow[]> {
  const { results } = await db
    .prepare("SELECT id, team_id, name, color FROM labels ORDER BY name")
    .all<LabelRow>();
  return results;
}

// False when the label already exists for the team.
export async function insertLabel(
  db: D1Database,
  label: LabelRow,
): Promise<boolean> {
  try {
    await db
      .prepare(
        "INSERT INTO labels (id, team_id, name, color) VALUES (?, ?, ?, ?)",
      )
      .bind(label.id, label.team_id, label.name, label.color)
      .run();
    return true;
  } catch {
    return false;
  }
}
