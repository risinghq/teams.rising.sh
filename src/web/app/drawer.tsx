import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";
import { SidebarContent } from "./sidebar";

export function Drawer({
  open,
  onOpenChange,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="w-72 gap-6 bg-sidebar p-4 md:hidden"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <SidebarContent
          onSearch={onSearch}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
