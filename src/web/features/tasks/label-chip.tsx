// A label as a tinted pill with a dot in its color. The tint keeps the text
// readable whatever color the label has.
export function LabelChip({
  label,
}: {
  label: { name: string; color: string };
}) {
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs"
      style={{
        background: `color-mix(in oklch, ${label.color} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: label.color }}
      />
      {label.name}
    </span>
  );
}
