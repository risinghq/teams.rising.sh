import { Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { IconButton } from "@/ui/icon-button";
import { SidebarContent } from "./sidebar";

// The palette and the phone drawer sit on Radix dialogs. They load on first
// use, so a first visit does not pay for code it may never open.
const Palette = lazy(() =>
  import("./palette").then((m) => ({ default: m.Palette })),
);
const Drawer = lazy(() =>
  import("./drawer").then((m) => ({ default: m.Drawer })),
);

// True from the first time `open` is true, so a lazy overlay stays mounted
// after it closes and can play its exit animation.
function useEverOpened(open: boolean) {
  const [ever, setEver] = useState(open);
  if (open && !ever) setEver(true);
  return ever;
}

export function Shell() {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const drawerLoaded = useEverOpened(drawer);
  const paletteLoaded = useEverOpened(palette);

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

  const openPalette = () => {
    setDrawer(false);
    setPalette(true);
  };

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <SidebarContent onSearch={openPalette} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <IconButton label="Abrir menú" onClick={() => setDrawer(true)}>
            <Menu />
          </IconButton>
          <span className="font-semibold">Teams</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Suspense fallback={null}>
        {drawerLoaded && (
          <Drawer
            open={drawer}
            onOpenChange={setDrawer}
            onSearch={openPalette}
          />
        )}
        {paletteLoaded && <Palette open={palette} onOpenChange={setPalette} />}
      </Suspense>
    </div>
  );
}
