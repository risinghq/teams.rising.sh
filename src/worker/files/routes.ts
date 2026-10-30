import { Hono } from "hono";
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES } from "../../shared/schemas";
import type { Env } from "../env";
import { HttpError, id } from "../http";

type UploadType = keyof typeof UPLOAD_TYPES;

const isUploadType = (type: string): type is UploadType => type in UPLOAD_TYPES;

export const fileRoutes = new Hono<Env>();

// The body is the file itself, typed by its content-type header.
fileRoutes.post("/files", async (c) => {
  const type = (c.req.header("content-type") ?? "").split(";")[0]!.trim();
  if (!isUploadType(type))
    throw new HttpError(
      415,
      "solo se aceptan imágenes PNG, JPEG, GIF, WebP o AVIF",
    );
  const declared = Number(c.req.header("content-length") ?? 0);
  if (declared > UPLOAD_MAX_BYTES)
    throw new HttpError(413, "el archivo supera 5 MB");
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) throw new HttpError(400, "el archivo está vacío");
  if (body.byteLength > UPLOAD_MAX_BYTES)
    throw new HttpError(413, "el archivo supera 5 MB");
  const key = `${id()}.${UPLOAD_TYPES[type]}`;
  await c.env.FILES.put(key, body, {
    httpMetadata: { contentType: type },
    customMetadata: { uploaded_by: c.get("user").id },
  });
  return c.json({ url: `/api/files/${key}` }, 201);
});

// A key never changes content, so a browser keeps it for good. Only signed-in
// people reach this route, so the cache stays private.
fileRoutes.get("/files/:key", async (c) => {
  const object = await c.env.FILES.get(c.req.param("key"));
  if (!object) throw new HttpError(404, "archivo no encontrado");
  return new Response(await object.arrayBuffer(), {
    headers: {
      "content-type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});
