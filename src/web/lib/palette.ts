export type PaletteItem = {
  id: string;
  kind: "task" | "team" | "screen";
  label: string;
  hint: string;
  to: string;
};

// A key query like "ops-12" ranks by prefix. Words match anywhere in the label,
// in any order. Tasks come after teams and screens that match equally.
export function searchPalette(items: PaletteItem[], query: string, limit = 12) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items.slice(0, limit);
  const scored = items.flatMap((item) => {
    const hay = `${item.label} ${item.hint}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return [];
    const starts = words.some(
      (w) =>
        item.hint.toLowerCase().startsWith(w) ||
        item.label.toLowerCase().startsWith(w),
    );
    const rank = (starts ? 0 : 2) + (item.kind === "task" ? 1 : 0);
    return [{ item, rank }];
  });
  return scored
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((s) => s.item);
}
