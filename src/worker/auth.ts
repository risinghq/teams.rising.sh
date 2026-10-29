import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env, User } from "./env";
import { HttpError, id, type C } from "./http";

const SESSION_DAYS = 30;
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

type Claims = {
  iss: string;
  aud: string;
  exp: number;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

function bytes(n: number): string {
  const raw = crypto.getRandomValues(new Uint8Array(n));
  return [...raw].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const list = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function allowed(email: string, env: Env["Bindings"]): boolean {
  const lower = email.toLowerCase();
  if (list(env.ALLOWED_EMAILS).includes(lower)) return true;
  return list(env.ALLOWED_DOMAINS).includes(lower.split("@")[1] ?? "");
}

// The ID token comes straight from Google's token endpoint over TLS, so OIDC
// Core 3.1.3.7 lets us skip the signature check and validate the claims.
function claimsOf(idToken: string, clientId: string): Claims {
  const payload = idToken.split(".")[1];
  if (!payload) throw new HttpError(400, "token de identidad mal formado");
  const claims = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
        (ch) => ch.charCodeAt(0),
      ),
    ),
  ) as Claims;
  const issuerOk = [
    "https://accounts.google.com",
    "accounts.google.com",
  ].includes(claims.iss);
  if (!issuerOk || claims.aud !== clientId || claims.exp * 1000 < Date.now()) {
    throw new HttpError(400, "token de identidad rechazado");
  }
  if (!claims.email_verified)
    throw new HttpError(403, "el correo no está verificado");
  return claims;
}

export async function startSession(c: C, userId: string): Promise<void> {
  const sessionId = bytes(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  )
    .bind(sessionId, userId, expires)
    .run();
  setCookie(c, "session", sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

// The first user to sign in becomes an admin.
async function upsertUser(
  c: C,
  email: string,
  name: string,
  avatar: string | null,
): Promise<string> {
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    await c.env.DB.prepare(
      "UPDATE users SET name = ?, avatar_url = ? WHERE id = ?",
    )
      .bind(name, avatar, existing.id)
      .run();
    return existing.id;
  }
  const userId = id();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, avatar_url, is_admin)
     VALUES (?, ?, ?, ?, NOT EXISTS (SELECT 1 FROM users WHERE kind = 'human'))`,
  )
    .bind(userId, email, name, avatar)
    .run();
  return userId;
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

authRoutes.get("/google/callback", async (c) => {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: secret } = c.env;
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
    throw new HttpError(403, "esta cuenta no tiene acceso");
  const userId = await upsertUser(
    c,
    claims.email,
    claims.name ?? claims.email,
    claims.picture ?? null,
  );
  if (tokens.refresh_token) {
    await c.env.DB.prepare(
      `INSERT INTO google_tokens (user_id, refresh_token) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET refresh_token = excluded.refresh_token,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
      .bind(userId, tokens.refresh_token)
      .run();
  }
  await startSession(c, userId);
  return c.redirect("/");
});

authRoutes.post("/dev", async (c) => {
  if (c.env.DEV_LOGIN !== "1") throw new HttpError(404, "no encontrado");
  const { email, name } = (await c.req.json()) as {
    email: string;
    name?: string;
  };
  const userId = await upsertUser(c, email, name ?? email, null);
  await startSession(c, userId);
  return c.json({ id: userId });
});

authRoutes.post("/logout", async (c) => {
  const session = getCookie(c, "session");
  if (session)
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(session)
      .run();
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

export async function requireUser(
  c: C,
  next: () => Promise<void>,
): Promise<void> {
  const session = getCookie(c, "session");
  const user = session
    ? await c.env.DB.prepare(
        `SELECT u.id, u.email, u.name, u.avatar_url, u.is_admin FROM sessions s
         JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
      )
        .bind(session, new Date().toISOString())
        .first<User>()
    : null;
  if (!user) throw new HttpError(401, "inicia sesión para continuar");
  c.set("user", user);
  await next();
}
