import { id } from "../http";
import { splitKey, taskKeys } from "../github/events";
import { findVisibleTask } from "../tasks/queries";
import type { Inbound } from "./messages";
import { insertWhatsappUpdate, messageSeen, userByNumber } from "./queries";

// Writes the message as a `whatsapp` update on the first task it names that
// the sender may see. Meta redelivers on a slow reply, so a message id is
// written once.
export async function applyMessage(db: D1Database, m: Inbound) {
  const user = await userByNumber(db, m.from);
  if (!user) return false;
  if (await messageSeen(db, m.waId)) return false;
  for (const key of taskKeys(m.text)) {
    const { team, number } = splitKey(key);
    const task = await findVisibleTask(db, user, team, number);
    if (!task) continue;
    await insertWhatsappUpdate(db, id(), task.id, user.id, m.text, m.waId);
    return true;
  }
  return false;
}
