type Json = Record<string, any>;

export type Inbound = { waId: string; from: string; text: string };

export function inboundMessages(p: Json): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        if (m.type === "text" && m.text?.body)
          out.push({ waId: m.id, from: m.from, text: m.text.body });
      }
    }
  }
  return out;
}
