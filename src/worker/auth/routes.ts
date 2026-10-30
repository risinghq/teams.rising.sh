import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { devLogin } from "../../shared/schemas";
import type { Env } from "../env";
import { HttpError, id, parseBody, type C } from "../http";
import { allowed, claimsOf, GOOGLE_AUTH, GOOGLE_TOKEN, SCOPES } from "./google";
import {
  deleteSession,
  insertSession,
  saveRefreshToken,
  upsertUser,
  userBySession,
} from "./queries";

const SESSION_DAYS = 30;

function bytes(n: number): string {
  const raw = crypto.getRandomValues(new Uint8Array(n));
  return [...raw].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function startSession(c: C, userId: string): Promise<void> {
  const sessionId = bytes(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await insertSession(c.env.DB, sessionId, userId, expires);
  setCookie(c, "session", sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export const authRoutes = new Hono<Env>();

authRoutes.get("/google", (c) => {
  if (!c.env.GOOGLE_CLIENT_ID)
    throw new HttpError(
      400,
      "el inicio de sesión con Google no está configurado",
    );
  const state = bytes(16);
  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/api/auth",
    maxAge: 600,
  });
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: new URL("/api/auth/google/callback", c.req.url).toString(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return c.redirect(url.toString());
});

// The callback is a browser navigation, so a refusal goes back to the login
// page with its message instead of rendering JSON.
authRoutes.get("/google/callback", async (c) => {
  try {
    await completeGoogleSignIn(c);
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    return c.redirect(`/login?${new URLSearchParams({ error: err.message })}`);
  }
  return c.redirect("/");
});

async function completeGoogleSignIn(c: C): Promise<void> {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: secret } = c.env;
  if (c.req.query("error"))
    throw new HttpError(400, "se canceló el inicio de sesión con Google");
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!clientId || !secret)
    throw new HttpError(
      400,
      "el inicio de sesión con Google no está configurado",
    );
  if (!code || !state || state !== getCookie(c, "oauth_state")) {
    throw new HttpError(
      400,
      "el inicio de sesión expiró o se abrió dos veces; vuelve a intentarlo desde el principio",
    );
  }
  deleteCookie(c, "oauth_state", { path: "/api/auth" });
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: secret,
      redirect_uri: new URL("/api/auth/google/callback", c.req.url).toString(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok)
    throw new HttpError(400, "Google rechazó el código de inicio de sesión");
  const tokens = (await response.json()) as {
    id_token: string;
    refresh_token?: string;
  };
  const claims = claimsOf(tokens.id_token, clientId);
  if (!allowed(claims.email, c.env))
    throw new HttpError(
      403,
      `${claims.email} no tiene acceso; pide a un admin que la agregue`,
    );
  const userId = await upsertUser(
    c.env.DB,
    id(),
    claims.email,
    claims.name ?? claims.email,
    claims.picture ?? null,
  );
  if (tokens.refresh_token)
    await saveRefreshToken(c.env.DB, userId, tokens.refresh_token);
  await startSession(c, userId);
}

authRoutes.post("/dev", async (c) => {
  if (c.env.DEV_LOGIN !== "1") throw new HttpError(404, "no encontrado");
  const { email, name } = await parseBody(c, devLogin);
  const userId = await upsertUser(c.env.DB, id(), email, name ?? email, null);
  await startSession(c, userId);
  return c.json({ id: userId });
});

authRoutes.post("/logout", async (c) => {
  const session = getCookie(c, "session");
  if (session) await deleteSession(c.env.DB, session);
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

export async function requireUser(
  c: C,
  next: () => Promise<void>,
): Promise<void> {
  const session = getCookie(c, "session");
  const user = session ? await userBySession(c.env.DB, session) : null;
  if (!user) throw new HttpError(401, "inicia sesión para continuar");
  c.set("user", user);
  await next();
}
