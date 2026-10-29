import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Menu,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { useInbox, useMe, useTeams } from "./data";
import { searchPalette, type PaletteItem } from "./lib";
import { Avatar } from "./ui";

const nav =
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted";
const navOn = { className: "bg-muted font-medium" };

export function Shell() {
  const me = useMe();
  const teams = useTeams();
  const inbox = useInbox();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setDrawer(false);
  const unread = inbox.data?.unread ?? 0;

  return (
    <div className="flex h-full">
      {drawer && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-4 border-r bg-sidebar p-3 transition-transform md:static md:w-[284px] md:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="font-semibold">Teams</span>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            aria-label="Search"
          >
            <Search size={12} /> ⌘K
          </button>
        </div>
        <nav className="flex flex-col gap-0.5" onClick={close}>
          <Link
            to="/"
            className={nav}
            activeProps={navOn}
            activeOptions={{ exact: true }}
          >
            <CheckSquare size={16} /> My work
          </Link>
          <Link to="/inbox" className={nav} activeProps={navOn}>
            <Bell size={16} /> Inbox
            {unread > 0 && (
              <span
                aria-label={`${unread} unread`}
                className="ml-auto h-2 w-2 rounded-full bg-primary"
              />
            )}
          </Link>
          <Link to="/calendar" className={nav} activeProps={navOn}>
            <CalendarDays size={16} /> Calendar
          </Link>
          <Link to="/overview" className={nav} activeProps={navOn}>
            <LayoutDashboard size={16} /> Overview
          </Link>
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto" onClick={close}>
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Teams
          </p>
          {teams.data?.map((t) => (
            <Link
              key={t.key}
              to="/t/$team"
              params={{ team: t.key }}
              className={nav}
              activeProps={navOn}
            >
              <span className="w-9 text-xs text-muted-foreground">{t.key}</span>
              {t.name}
            </Link>
          ))}
        </div>
        {me.data && (
          <div className="flex items-center gap-2 border-t px-2 pt-3">
            <Avatar person={me.data} size={24} />
            <span className="min-w-0 flex-1 truncate text-xs">
              {me.data.name}
            </span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={async () => {
                await api.logout();
                window.location.assign("/login");
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
            className="rounded-md p-1 hover:bg-muted"
          >
            <Menu size={18} />
          </button>
          <span className="font-semibold">Teams</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const teams = useTeams();
  const tasks = useQuery({
    queryKey: ["tasks", { palette: "1" }],
    queryFn: () => api.tasks({ top: "0" }),
  });
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const items = useMemo<PaletteItem[]>(
    () => [
      { id: "s-work", kind: "screen", label: "My work", hint: "", to: "/" },
      { id: "s-inbox", kind: "screen", label: "Inbox", hint: "", to: "/inbox" },
      {
        id: "s-cal",
        kind: "screen",
        label: "Calendar",
        hint: "",
        to: "/calendar",
      },
      {
        id: "s-over",
        kind: "screen",
        label: "Overview",
        hint: "",
        to: "/overview",
      },
      ...(teams.data ?? []).map((t) => ({
        id: `t-${t.key}`,
        kind: "team" as const,
        label: t.name,
        hint: t.key,
        to: `/t/${t.key}`,
      })),
      ...(tasks.data ?? []).map((t) => ({
        id: `k-${t.key}`,
        kind: "task" as const,
        label: t.title,
        hint: t.key,
        to: `/t/${t.team}/${t.number}`,
      })),
    ],
    [teams.data, tasks.data],
  );
  const results = searchPalette(items, q);

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    void navigate({ to: item.to });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAt((i) => Math.min(i + 1, results.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setAt((i) => Math.max(i - 1, 0));
          }
          if (e.key === "Enter") go(results[at]);
        }}
      >
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
          }}
          placeholder="Jump to a task, team or screen"
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nothing matches.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => go(r)}
                onMouseEnter={() => setAt(i)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
                  i === at && "bg-muted",
                )}
              >
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {r.hint || r.kind}
                </span>
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
