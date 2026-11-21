import type { Env } from "../env";
import { HttpError } from "../http";

export const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
// Google rates both calendar scopes non-sensitive, so the app needs no
// sensitive-scope review. Teams writes only to the calendar it creates and
// reads only free/busy.
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.app.created",
  "https://www.googleapis.com/auth/calendar.freebusy",
];
export const SCOPES = ["openid", "email", "profile", ...CALENDAR_SCOPES].join(
  " ",
);
export const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";

// True when the stored grant reaches more of the calendar than Teams asks
// for: a grant stored before scopes were recorded (null) held the full
// `calendar` scope. Only revoking the grant removes it from the account.
export function grantNeedsReview(scope: string | null | undefined): boolean {
  if (scope === undefined) return false;
  if (scope === null) return true;
  return scope
    .split(" ")
    .some(
      (s) =>
        s.startsWith("https://www.googleapis.com/auth/calendar") &&
        !CALENDAR_SCOPES.includes(s),
    );
}

export type Claims = {
  iss: string;
  aud: string;
  exp: number;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

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
export function claimsOf(idToken: string, clientId: string): Claims {
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
