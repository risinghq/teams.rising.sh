import { useSyncExternalStore } from "react";

// The theme a person picks: follow the system, or always light or dark. The
// pick lives in localStorage; index.html reads it before the first paint, so
// a dark page never flashes light. Keep the key and the rule in step with the
// script there.
export type ThemePick = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export const resolveTheme = (pick: ThemePick, systemDark: boolean): Theme =>
  pick === "system" ? (systemDark ? "dark" : "light") : pick;

function readPick(): ThemePick {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage can be off, as in some private windows: follow the system.
    return "system";
  }
}

const listeners = new Set<() => void>();
let pick: ThemePick = readPick();

// Sets the theme without the colors animating: every component has its own
// transition, so a switch would ripple across the page.
function apply() {
  const root = document.documentElement;
  const theme = resolveTheme(pick, darkQuery().matches);
  if (root.dataset.theme === theme) return;
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);
  root.dataset.theme = theme;
  void getComputedStyle(root).color;
  requestAnimationFrame(() => freeze.remove());
}

export function setThemePick(next: ThemePick) {
  pick = next;
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // The pick still holds for this visit.
  }
  apply();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // A system change matters only while the pick follows the system.
  const query = darkQuery();
  const onSystem = () => {
    apply();
    listener();
  };
  query.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", onSystem);
  };
}

const snapshot = () =>
  `${pick}:${resolveTheme(pick, darkQuery().matches)}` as const;

// The pick and the theme it gives right now.
export function useTheme(): { pick: ThemePick; theme: Theme } {
  const [p, t] = useSyncExternalStore(subscribe, snapshot).split(":");
  return { pick: p as ThemePick, theme: t as Theme };
}
