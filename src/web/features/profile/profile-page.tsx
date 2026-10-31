import { Monitor, Moon, Sun } from "lucide-react";
import type { Me } from "@shared/types";
import { useState } from "react";
import { api } from "@/api";
import { ImagePicker } from "@/features/files/image-picker";
import { Section } from "@/features/settings/section";
import { useMe } from "@/features/teams/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useWrite } from "@/hooks/use-write";
import { mentionHandle } from "@/lib/mentions";
import { mePatch } from "@/lib/optimistic";
import { setThemePick, useTheme } from "@/lib/theme";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Page, PageHeader } from "@/ui/page-header";
import { SegmentedControl } from "@/ui/segmented-control";
import { SkeletonRows } from "@/ui/skeleton";

const usePatchMe = () =>
  useWrite("patchMe", (body: Record<string, unknown>) => api.patchMe(body), {
    optimistic: mePatch,
  });

export function ProfilePage() {
  const me = useMe().data;
  return (
    <Page width="form">
      <PageHeader title="Perfil" />
      {me ? <ProfileForm me={me} /> : <SkeletonRows rows={4} />}
      <Appearance />
    </Page>
  );
}

const THEMES = [
  { value: "system", label: "Como el sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
] as const;

// The theme for this browser. It applies at once; there is nothing to save.
function Appearance() {
  const { pick } = useTheme();
  return (
    <Section title="Apariencia">
      <div className="flex flex-col gap-2 px-4 pt-2 pb-4">
        <SegmentedControl
          legend="Tema"
          value={pick}
          onValueChange={setThemePick}
          options={THEMES}
          className="w-full sm:w-fit"
        />
        <p className="text-xs text-muted-foreground">
          "Como el sistema" cambia solo cuando tu computadora pasa a modo claro
          u oscuro. Se guarda en este navegador.
        </p>
      </div>
    </Section>
  );
}

const orNull = (s: string) => s.trim() || null;

function ProfileForm({ me }: { me: Me }) {
  const save = usePatchMe();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username ?? "");
  const [phone, setPhone] = useState(me.whatsapp_number ?? "");
  const changed =
    name !== me.name ||
    orNull(username) !== me.username ||
    orNull(phone) !== me.whatsapp_number;
  const emailHandle = mentionHandle({ ...me, username: null });
  return (
    <>
      <Section title="Foto">
        <div className="px-4 pt-2 pb-4">
          <ImagePicker
            label="Foto de perfil"
            value={me.avatar_url}
            disabled={save.isPending}
            onChange={(url) => save.mutate({ avatar_url: url })}
          >
            <PersonAvatar person={me} size={48} />
          </ImagePicker>
        </div>
      </Section>
      <Section title="Datos">
        <form
          className="flex flex-col gap-4 px-4 pt-2 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            // The server normalizes the handle and the number, so the form
            // shows what was stored.
            save.mutate(
              {
                name: name.trim(),
                username: orNull(username),
                whatsapp_number: orNull(phone),
              },
              {
                onSuccess: (saved) => {
                  setName(saved.name);
                  setUsername(saved.username ?? "");
                  setPhone(saved.whatsapp_number ?? "");
                },
              },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-username">Usuario</Label>
            <Input
              id="profile-username"
              autoComplete="off"
              spellCheck={false}
              value={username}
              placeholder={emailHandle}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Te mencionan como @
              {orNull(username)?.toLowerCase() ?? emailHandle}.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">Correo</Label>
            <Input id="profile-email" value={me.email} readOnly disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-whatsapp">WhatsApp</Label>
            <Input
              id="profile-whatsapp"
              type="tel"
              autoComplete="tel"
              value={phone}
              placeholder="+51 987 654 321"
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {me.whatsapp_number
                ? me.whatsapp_verified
                  ? "Confirmado."
                  : "Pendiente de confirmar. Aún no enviamos avisos por WhatsApp."
                : "Con el código de país. Lo usaremos para avisos cuando estén disponibles."}
            </p>
          </div>
          {changed && (
            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending || !name.trim()}>
                Guardar
              </Button>
            </div>
          )}
        </form>
      </Section>
    </>
  );
}
