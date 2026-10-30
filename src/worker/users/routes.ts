import { Hono } from "hono";
import type { Me, User } from "../../shared/types";
import type { Env } from "../env";
import { listUsers, teamsOf } from "./queries";

export const userRoutes = new Hono<Env>();

userRoutes.get("/users", async (c) => {
  const users: User[] = await listUsers(c.env.DB);
  return c.json(users);
});

userRoutes.get("/me", async (c) => {
  const user = c.get("user");
  const me: Me = {
    ...user,
    is_admin: user.is_admin === 1,
    teams: await teamsOf(c.env.DB, user.id),
  };
  return c.json(me);
});
