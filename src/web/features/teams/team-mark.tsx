import { useTeams } from "./hooks";

// Most team keys share an "AI" prefix, so the letter rarely tells teams apart
// and the color has to. Stepping by the golden angle through the teams sorted
// by key keeps every pair of hues far apart; a hash of the key does not.
const GOLDEN_ANGLE = 137.508;
const FIRST_HUE = 265;

function hueOf(teamKey: string, keys: string[]) {
  const index = keys.indexOf(teamKey);
  return index < 0 ? FIRST_HUE : (FIRST_HUE + index * GOLDEN_ANGLE) % 360;
}

// A colored square with the team's initial, the same color everywhere.
export function TeamMark({
  teamKey,
  size = 20,
}: {
  teamKey: string;
  size?: number;
}) {
  const keys = (useTeams().data ?? []).map((t) => t.key).sort();
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `oklch(0.6 0.13 ${hueOf(teamKey, keys)})`,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold text-white"
    >
      {teamKey[0]}
    </span>
  );
}
