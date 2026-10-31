// The small part of Markdown that comments and descriptions use: lists,
// checkboxes, **bold**, `code`, code blocks and TeX math ($x$ and $$ … $$).
// Rendering builds React elements from these pieces, never HTML from the text,
// so a comment cannot inject markup. Math is the one exception: KaTeX turns it
// into HTML, and KaTeX escapes what it is given.

export type ListItem = {
  text: string;
  // null for a plain item, true or false for a checkbox.
  checked: boolean | null;
  // The item's line in the source, so a click on its checkbox can flip it.
  line: number;
};

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: ListItem[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "math"; tex: string };

const ITEM = /^\s*(?:([-*])|(\d+)[.)])\s+(?:\[([ xX])\](?:\s+|$))?(.*)$/;
const MARKER = /^(\s*)([-*]|\d+[.)])\s+(\[[ xX]\]\s*)?/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Extract<Block, { kind: "list" }> | null = null;
  const endParagraph = () => {
    if (paragraph.length > 0)
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    // A fence or a $$ line opens a block that runs to its closing line, or to
    // the end when it never closes. Nothing inside is parsed further.
    const fence = /^```\s*([\w+-]*)\s*$/.exec(trimmed);
    if (fence || trimmed.startsWith("$$")) {
      endParagraph();
      list = null;
      if (fence) {
        const body: string[] = [];
        while (++i < lines.length && !(lines[i] ?? "").trim().startsWith("```"))
          body.push(lines[i] ?? "");
        blocks.push({
          kind: "code",
          lang: fence[1] ?? "",
          text: body.join("\n"),
        });
      } else {
        const rest = trimmed.slice(2);
        const oneLine = rest.endsWith("$$") && rest.length > 2;
        const body = [oneLine ? rest.slice(0, -2) : rest];
        if (!oneLine)
          while (++i < lines.length) {
            const l = lines[i] ?? "";
            if (l.trim().endsWith("$$")) {
              body.push(l.trim().slice(0, -2));
              break;
            }
            body.push(l);
          }
        blocks.push({ kind: "math", tex: body.join("\n").trim() });
      }
      continue;
    }
    const m = ITEM.exec(line);
    if (!m) {
      // A blank line ends a paragraph or a list; any other line joins the
      // paragraph.
      list = null;
      if (trimmed === "") endParagraph();
      else paragraph.push(line);
      continue;
    }
    endParagraph();
    const ordered = m[2] !== undefined;
    const item: ListItem = {
      text: m[4] ?? "",
      checked: m[3] === undefined ? null : m[3] !== " ",
      line: i,
    };
    // TypeScript narrows `list` to null across the loop's resets; the cast
    // restores what it may hold from an earlier line.
    const open = list as Extract<Block, { kind: "list" }> | null;
    if (open?.ordered === ordered) open.items.push(item);
    else {
      list = { kind: "list", ordered, items: [item] };
      blocks.push(list);
    }
  }
  endParagraph();
  return blocks;
}
export type Span = { kind: "text" | "bold" | "code" | "math"; text: string };

// Inline math is $…$ with no space just inside either dollar and no digit
// right after the closing one, so "cuesta $20 o $30" stays text.
const INLINE =
  /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g;

export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last)
      spans.push({ kind: "text", text: text.slice(last, m.index) });
    spans.push(
      m[1] !== undefined
        ? { kind: "bold", text: m[1] }
        : m[2] !== undefined
          ? { kind: "code", text: m[2] }
          : { kind: "math", text: m[3] ?? "" },
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ kind: "text", text: text.slice(last) });
  return spans;
}
// Flips the checkbox on one line of the source.
export function toggleCheckbox(text: string, line: number): string {
  const lines = text.split("\n");
  const at = lines[line];
  if (at === undefined) return text;
  lines[line] = at.replace(/\[([ xX])\]/, (_, mark: string) =>
    mark === " " ? "[x]" : "[ ]",
  );
  return lines.join("\n");
}

export type Edit = { text: string; start: number; end: number };

const lineStart = (text: string, at: number) =>
  text.lastIndexOf("\n", at - 1) + 1;

// Enter inside a list item opens the next item; Enter on an empty item ends
// the list. Null when the caret is not in a list item.
export function continueList(text: string, caret: number): Edit | null {
  const start = lineStart(text, caret);
  const before = text.slice(start, caret);
  const m = MARKER.exec(before);
  if (!m) return null;
  if (before.slice(m[0].length).trim() === "") {
    const next = text.slice(0, start) + text.slice(caret);
    return { text: next, start, end: start };
  }
  const n = Number.parseInt(m[2] ?? "", 10);
  const marker = Number.isNaN(n) ? m[2] : `${n + 1}${(m[2] ?? "").slice(-1)}`;
  const insert = `\n${m[1]}${marker} ${m[3] ? "[ ] " : ""}`;
  const at = caret + insert.length;
  return {
    text: text.slice(0, caret) + insert + text.slice(caret),
    start: at,
    end: at,
  };
}

// Turns the selected lines into list items or checkboxes, or back into plain
// lines when they all already are.
export function toggleList(
  text: string,
  start: number,
  end: number,
  kind: "bullet" | "check",
): Edit {
  const from = lineStart(text, start);
  const to =
    text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
  const lines = text.slice(from, to).split("\n");
  const prefix = kind === "check" ? "- [ ] " : "- ";
  const has = (l: string) =>
    kind === "check"
      ? /^\s*[-*]\s+\[[ xX]\]/.test(l)
      : /^\s*[-*]\s+(?!\[[ xX]\])/.test(l);
  const all = lines.every(has);
  const next = lines.map((l) => {
    const plain = l.replace(MARKER, "");
    return all ? plain : prefix + plain;
  });
  const block = next.join("\n");
  // A selection stays selected; a bare caret goes to the end of its line,
  // ready to type the item.
  return {
    text: text.slice(0, from) + block + text.slice(to),
    start: start === end ? from + block.length : from,
    end: from + block.length,
  };
}

// Wraps the selection in a mark like ** or `, or takes the marks off when
// they already surround it, so a second click undoes the first. With nothing
// selected the caret lands between the marks, ready to type.
export function wrap(
  text: string,
  start: number,
  end: number,
  mark: string,
): Edit {
  const n = mark.length;
  if (
    text.slice(start - n, start) === mark &&
    text.slice(end, end + n) === mark
  )
    return {
      text:
        text.slice(0, start - n) + text.slice(start, end) + text.slice(end + n),
      start: start - n,
      end: end - n,
    };
  const inner = text.slice(start, end);
  return {
    text: text.slice(0, start) + mark + inner + mark + text.slice(end),
    start: start + n,
    end: end + n,
  };
}

// Code or math around the selection: inline marks for part of a line, a
// fenced block when the selection spans lines.
export function wrapBlock(
  text: string,
  start: number,
  end: number,
  kind: "code" | "math",
): Edit {
  const inline = kind === "code" ? "`" : "$";
  if (!text.slice(start, end).includes("\n"))
    return wrap(text, start, end, inline);
  const fence = kind === "code" ? "```" : "$$";
  const from = lineStart(text, start);
  const nl = text.indexOf("\n", end);
  const to = nl === -1 ? text.length : nl;
  const open = `${fence}\n`;
  const block = `${open}${text.slice(from, to)}\n${fence}`;
  return {
    text: text.slice(0, from) + block + text.slice(to),
    start: from + open.length,
    end: from + block.length - fence.length - 1,
  };
}

// The TeX under the caret, for a live preview: inside a $$ … $$ block, inside
// $…$ on the caret's line, or after a $ still being typed. Null elsewhere. A
// $ followed by a digit and never closed is a price, not math.
export function mathAt(
  text: string,
  caret: number,
): { tex: string; display: boolean } | null {
  // Display blocks: $$ markers pair up in order.
  const marks = [...text.matchAll(/\$\$/g)].map((m) => m.index);
  for (let i = 0; i < marks.length; i += 2) {
    const open = marks[i] ?? 0;
    const close = marks[i + 1];
    if (caret > open + 1 && (close === undefined || caret <= close)) {
      const tex = text.slice(open + 2, close ?? text.length).trim();
      return tex ? { tex, display: true } : null;
    }
  }
  const from = lineStart(text, caret);
  const nl = text.indexOf("\n", caret);
  const line = text.slice(from, nl === -1 ? text.length : nl);
  const at = caret - from;
  // Single dollars on the line, leaving out $$ and code spans.
  const masked = line
    .replace(/`[^`]*`/g, (s) => " ".repeat(s.length))
    .replace(/\$\$/g, "  ");
  const dollars = [...masked.matchAll(/\$/g)].map((m) => m.index);
  for (let i = 0; i < dollars.length; i += 2) {
    const open = dollars[i] ?? 0;
    const close = dollars[i + 1];
    if (at <= open) break;
    if (close !== undefined && at > close) continue;
    const tex = line.slice(open + 1, close ?? line.length).trim();
    if (!tex || (close === undefined && /^\d/.test(tex))) return null;
    return { tex, display: false };
  }
  return null;
}
