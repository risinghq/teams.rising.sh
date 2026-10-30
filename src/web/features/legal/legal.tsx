import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const CONTACT = "dadch1404@gmail.com";
const UPDATED = "30 de octubre de 2026";

function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="h-full overflow-y-auto">
      <article className="mx-auto max-w-2xl space-y-4 px-6 py-16 text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        <Link
          to="/login"
          className="inline-block rounded-lg text-xs text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Teams
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Última actualización: {UPDATED}
        </p>
        {children}
        <h2>Contacto</h2>
        <p>
          Escribe a{" "}
          <a href={`mailto:${CONTACT}`} className="underline">
            {CONTACT}
          </a>{" "}
          para cualquier consulta sobre este documento.
        </p>
      </article>
    </main>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        Teams (teams.rising.sh) es la herramienta interna de rising.sh para
        organizar tareas, proyectos y fechas de entrega de sus equipos. Solo
        pueden entrar las cuentas que un administrador autoriza.
      </p>
      <h2>Qué datos usamos</h2>
      <ul>
        <li>
          De tu cuenta de Google: nombre, correo y foto de perfil, para
          identificarte dentro de la aplicación.
        </li>
        <li>
          Lo que escribes en Teams: tareas, comentarios, proyectos, eventos y
          etiquetas.
        </li>
        <li>
          Si lo configura tu equipo: el número de WhatsApp y los mensajes que
          envías al número de Teams, y las referencias a tareas en GitHub.
        </li>
      </ul>
      <h2>Google Calendar</h2>
      <p>
        Al iniciar sesión, Teams pide acceso a tu Google Calendar. Lo usa solo
        para crear, actualizar y borrar en tu calendario principal los eventos
        que tú creas en Teams. No lee ni copia los demás eventos de tu
        calendario. Para hacerlo, guardamos un token de actualización de Google
        asociado a tu cuenta.
      </p>
      <p>
        El uso y la transferencia a cualquier otra aplicación de la información
        recibida de las API de Google se ajustan a la{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          className="underline"
        >
          Política de datos de usuario de los servicios de API de Google
        </a>
        , incluidos los requisitos de uso limitado.
      </p>
      <h2>Dónde se guardan</h2>
      <p>
        Los datos se guardan en Cloudflare (Workers y D1). No vendemos ni
        compartimos tus datos con terceros, no los usamos para publicidad y no
        los usamos para entrenar modelos de inteligencia artificial.
      </p>
      <h2>Cuánto tiempo y cómo borrarlos</h2>
      <p>
        Guardamos tus datos mientras tu cuenta tenga acceso. Puedes retirar el
        acceso de Teams a tu cuenta de Google en cualquier momento desde{" "}
        <a
          href="https://myaccount.google.com/permissions"
          className="underline"
        >
          myaccount.google.com/permissions
        </a>
        . Si pides que borremos tu cuenta, eliminamos tu perfil y tu token de
        Google en un plazo de 30 días.
      </p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Términos de uso">
      <p>
        Teams (teams.rising.sh) es una herramienta interna de rising.sh. Al
        usarla aceptas estos términos.
      </p>
      <h2>Acceso</h2>
      <p>
        Solo pueden usar Teams las personas que un administrador autoriza. El
        acceso puede retirarse en cualquier momento.
      </p>
      <h2>Uso aceptable</h2>
      <p>
        Usa Teams para el trabajo de tu equipo. No intentes acceder a tareas o
        cuentas que no te corresponden ni interferir con el servicio.
      </p>
      <h2>Contenido</h2>
      <p>
        El contenido que creas pertenece a tu organización. Eres responsable de
        lo que publicas en tareas y comentarios.
      </p>
      <h2>Servicio</h2>
      <p>
        Teams se ofrece tal como está, sin garantías. Podemos cambiar o
        suspender funciones en cualquier momento. El tratamiento de tus datos se
        describe en la{" "}
        <Link to="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </LegalPage>
  );
}
