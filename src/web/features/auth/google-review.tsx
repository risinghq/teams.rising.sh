import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

// Shown while the stored Google grant reaches more than Teams asks for. It has
// no way to close: the old grant leaves the account only when it is revoked,
// which the form does before Google asks for consent again.
export function GoogleReview() {
  const stay = (e: Event) => e.preventDefault();
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-w-md"
        onEscapeKeyDown={stay}
        onPointerDownOutside={stay}
        onInteractOutside={stay}
      >
        <DialogHeader>
          <DialogTitle>Revisa los permisos de Google</DialogTitle>
          <DialogDescription>
            Teams ahora pide menos acceso a tu Google Calendar. Antes podía ver
            y cambiar todos tus calendarios. Ahora solo usa un calendario
            «Teams» que crea para tus eventos y consulta tus horas ocupadas.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Google te pedirá aceptar los permisos nuevos y quitará el acceso
          anterior. Si cancelas, Teams deja de copiar tus eventos a Google hasta
          que aceptes.
        </p>
        <DialogFooter>
          <form method="post" action="/api/auth/google/review">
            <Button type="submit">Revisar permisos</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
