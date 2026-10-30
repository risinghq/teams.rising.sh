// GitHub signs a webhook body with HMAC-SHA256 as hex in `sha256=<hex>`.
const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function validSignature(
  secret: string,
  raw: string,
  header: string | undefined,
): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
  );
  const given = header.slice("sha256=".length);
  if (given.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++)
    diff |= mac.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
