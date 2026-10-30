// Hues for team marks, spaced so neighbours in the sidebar rarely match.
const MARK_HUES = [265, 200, 150, 35, 330, 95, 235, 10];

// A colored square with the team's initial, so teams are told apart at a
// glance. The color comes from the key, so it is stable everywhere.
export function TeamMark({
  teamKey,
  size = 20,
}: {
  teamKey: string;
  size?: number;
}) {
  const hash = [...teamKey].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7);
  const hue = MARK_HUES[Math.abs(hash) % MARK_HUES.length];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `oklch(0.6 0.13 ${hue})`,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold text-white"
    >
      {teamKey[0]}
    </span>
  );
}
