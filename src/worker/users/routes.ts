import { Hono } from "hono";
import { setWhatsappNumber as whatsappBody } from "../../shared/schemas";
import type { Me, User } from "../../shared/types";
import type { Env } from "../env";
import { HttpError, parseBody } from "../http";
import { listUsers, setWhatsappNumber, teamsOf } from "./queries";

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

userRoutes.put("/me/whatsapp", async (c) => {
  const { number } = await parseBody(c, whatsappBody);
  if (!(await setWhatsappNumber(c.env.DB, c.get("user").id, number)))
    throw new HttpError(409, "ese número pertenece a otra persona");
  return c.json({ whatsapp_number: number });
});
