import { isImageUrl, linkify } from "@/lib/text";

// Free text with its URLs as links, such as a paper or a spreadsheet.
export function LinkedText({ text }: { text: string }) {
  return linkify(text).map((s, i) =>
    s.url ? (
      <a
        key={i}
        href={s.url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {s.text}
      </a>
    ) : (
      s.text
    ),
  );
}

// The images a text links to, as thumbnails that open the full image.
export function ImagePreviews({ text }: { text: string }) {
  const urls = [
    ...new Set(
      linkify(text)
        .map((s) => s.url)
        .filter((u): u is string => !!u && isImageUrl(u)),
    ),
  ];
  if (urls.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img
            src={u}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-48 max-w-full rounded-lg border object-contain"
          />
        </a>
      ))}
    </span>
  );
}
