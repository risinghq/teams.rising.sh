export type Segment = { text: string; url?: string };

// Splits text so http(s) URLs can render as links. Trailing punctuation stays
// outside the URL.
export function linkify(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/g)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({ text: m[0], url: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

// A URL whose path names an image file, which a comment shows inline.
export function isImageUrl(url: string): boolean {
  try {
    return /\.(png|jpe?g|gif|webp|avif)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

// The first line of a description without its links, as a one-line summary.
export const summaryOf = (description: string) =>
  description
    .split("\n")
    .map((line) => line.replace(/https?:\/\/\S+/g, "").replace(/[:\s]+$/, ""))
    .find((line) => line.trim() !== "") ?? "";
