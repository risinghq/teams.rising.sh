import { linkify } from "@/lib/text";

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
