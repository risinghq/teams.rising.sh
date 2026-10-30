import { Hono } from "hono";
import { patchMe } from "../../shared/schemas";
import type { Me, User } from "../../shared/types";
import type { Env, SessionUser } from "../env";
import { type C, HttpError, parseBody } from "../http";
import {
  handleTaken,
  listUsers,
  numberTaken,
  profileOf,
  teamsOf,
  updateProfile,
} from "./queries";

export const userRoutes = new Hono<Env>();

userRoutes.get("/users", async (c) => {
  const users: User[] = await listUsers(c.env.DB);
  return c.json(users);
});

async function meOf(c: C, user: SessionUser): Promise<Me> {
  const { whatsapp_verified_at, ...profile } = user;
  return {
    ...profile,
    is_admin: user.is_admin === 1,
    whatsapp_verified: whatsapp_verified_at !== null,
    teams: await teamsOf(c.env.DB, user.id),
  };
}

userRoutes.get("/me", async (c) => c.json(await meOf(c, c.get("user"))));

userRoutes.patch("/me", async (c) => {
  const user = c.get("user");
  const input = await parseBody(c, patchMe);
  const next = {
    name: input.name ?? user.name,
    username: input.username === undefined ? user.username : input.username,
    avatar_url:
      input.avatar_url === undefined ? user.avatar_url : input.avatar_url,
    whatsapp_number:
      input.whatsapp_number === undefined
        ? user.whatsapp_number
        : input.whatsapp_number,
  };
  if (next.username && (await handleTaken(c.env.DB, user.id, next.username)))
    throw new HttpError(409, "ese nombre de usuario ya lo usa otra persona");
  if (
    next.whatsapp_number &&
    (await numberTaken(c.env.DB, user.id, next.whatsapp_number))
  )
    throw new HttpError(409, "ese número ya está registrado por otra persona");
  await updateProfile(c.env.DB, user.id, next);
  return c.json(await meOf(c, (await profileOf(c.env.DB, user.id))!));
});
