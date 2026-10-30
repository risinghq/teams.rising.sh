import { Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/ui/icon-button";
import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";
import { Palette } from "./palette";
import { SidebarContent } from "./sidebar";

export function Shell() {
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

  const openPalette = () => {
    setDrawer(false);
    setPalette(true);
  };

  return (
    <div className="flex h-full">
      <aside className="hidden w-[284px] shrink-0 flex-col gap-4 border-r bg-sidebar p-3 md:flex">
        <SidebarContent onSearch={openPalette} />
      </aside>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-72 gap-4 bg-sidebar p-3 md:hidden"
        >
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SidebarContent
            onSearch={openPalette}
            onNavigate={() => setDrawer(false)}
          />
        </SheetContent>
      </Sheet>
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
      <Palette open={palette} onOpenChange={setPalette} />
    </div>
  );
}
