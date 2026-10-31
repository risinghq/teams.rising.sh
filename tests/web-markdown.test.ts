import { describe, expect, test } from "bun:test";
import {
  continueList,
  mathAt,
  parseBlocks,
  parseInline,
  toggleCheckbox,
  toggleList,
  wrap,
  wrapBlock,
} from "../src/web/lib/markdown";

describe("parseBlocks", () => {
  test("splits paragraphs, bullets, checkboxes and numbered items", () => {
    const text = [
      "Pendientes del paper:",
      "- [ ] leer la sección 3",
      "- [x] bajar los datos",
      "",
      "1. uno",
      "2) dos",
      "* suelto",
    ].join("\n");
    expect(parseBlocks(text)).toEqual([
      { kind: "paragraph", text: "Pendientes del paper:" },
      {
        kind: "list",
        ordered: false,
        items: [
          { text: "leer la sección 3", checked: false, line: 1 },
          { text: "bajar los datos", checked: true, line: 2 },
        ],
      },
      {
        kind: "list",
        ordered: true,
        items: [
          { text: "uno", checked: null, line: 4 },
          { text: "dos", checked: null, line: 5 },
        ],
      },
      {
        kind: "list",
        ordered: false,
        items: [{ text: "suelto", checked: null, line: 6 }],
      },
    ]);
  });

  test("keeps plain text as is, with its line breaks", () => {
    expect(parseBlocks("hola\nmundo")).toEqual([
      { kind: "paragraph", text: "hola\nmundo" },
    ]);
    expect(parseBlocks("-sin espacio")).toEqual([
      { kind: "paragraph", text: "-sin espacio" },
    ]);
  });

  test("an empty checkbox still counts", () => {
    expect(parseBlocks("- [ ]")).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [{ text: "", checked: false, line: 0 }],
      },
    ]);
  });
});

test("parseInline finds bold and code and leaves stray marks", () => {
  expect(parseInline("usa **pytorch** y `pip install` ya, 2*3")).toEqual([
    { kind: "text", text: "usa " },
    { kind: "bold", text: "pytorch" },
    { kind: "text", text: " y " },
    { kind: "code", text: "pip install" },
    { kind: "text", text: " ya, 2*3" },
  ]);
});

test("toggleCheckbox flips only the given line", () => {
  const text = "- [ ] a\n- [x] b";
  expect(toggleCheckbox(text, 0)).toBe("- [x] a\n- [x] b");
  expect(toggleCheckbox(text, 1)).toBe("- [ ] a\n- [ ] b");
  expect(toggleCheckbox(text, 9)).toBe(text);
});

describe("continueList", () => {
  test("opens the next item of the same kind", () => {
    expect(continueList("- a", 3)).toEqual({
      text: "- a\n- ",
      start: 6,
      end: 6,
    });
    expect(continueList("- [x] a", 7)?.text).toBe("- [x] a\n- [ ] ");
    expect(continueList("9. a", 4)?.text).toBe("9. a\n10. ");
  });
  test("an empty item ends the list", () => {
    expect(continueList("- a\n- ", 6)).toEqual({
      text: "- a\n",
      start: 4,
      end: 4,
    });
  });
  test("does nothing outside a list", () => {
    expect(continueList("hola", 4)).toBeNull();
  });
});

describe("toggleList", () => {
  test("turns the selected lines into checkboxes and back", () => {
    const on = toggleList("a\nb", 0, 3, "check");
    expect(on.text).toBe("- [ ] a\n- [ ] b");
    expect(toggleList(on.text, 0, on.text.length, "check").text).toBe("a\nb");
  });
  test("with no selection the caret lands after the new marker", () => {
    expect(toggleList("", 0, 0, "check")).toEqual({
      text: "- [ ] ",
      start: 6,
      end: 6,
    });
  });
  test("swaps bullets for checkboxes", () => {
    expect(toggleList("- a", 0, 0, "check").text).toBe("- [ ] a");
    expect(toggleList("- [ ] a", 0, 0, "bullet").text).toBe("- a");
  });
});

test("wrap marks the selection or leaves the caret between the marks", () => {
  expect(wrap("hola mundo", 5, 10, "**")).toEqual({
    text: "hola **mundo**",
    start: 7,
    end: 12,
  });
  expect(wrap("ab", 1, 1, "`")).toEqual({ text: "a``b", start: 2, end: 2 });
});

describe("code and math", () => {
  test("fenced code keeps its lines and is not parsed further", () => {
    const text =
      "Antes:\n```python\nx = 2 * 3  # **no negrita**\n- no lista\n```\ndespués";
    expect(parseBlocks(text)).toEqual([
      { kind: "paragraph", text: "Antes:" },
      {
        kind: "code",
        lang: "python",
        text: "x = 2 * 3  # **no negrita**\n- no lista",
      },
      { kind: "paragraph", text: "después" },
    ]);
  });
  test("an unclosed fence runs to the end", () => {
    expect(parseBlocks("```\nprint(1)")).toEqual([
      { kind: "code", lang: "", text: "print(1)" },
    ]);
  });
  test("display math on one line or across lines", () => {
    expect(parseBlocks("$$E=mc^2$$")).toEqual([
      { kind: "math", tex: "E=mc^2" },
    ]);
    expect(parseBlocks("$$\n\\int_0^1 x\\,dx\n$$")).toEqual([
      { kind: "math", tex: "\\int_0^1 x\\,dx" },
    ]);
  });
  test("inline math, but not prices", () => {
    expect(parseInline("la pérdida $L = \\sum_i x_i$ baja")).toEqual([
      { kind: "text", text: "la pérdida " },
      { kind: "math", text: "L = \\sum_i x_i" },
      { kind: "text", text: " baja" },
    ]);
    expect(parseInline("cuesta $20 o $30")).toEqual([
      { kind: "text", text: "cuesta $20 o $30" },
    ]);
    expect(parseInline("`$x$` es código")[0]).toEqual({
      kind: "code",
      text: "$x$",
    });
  });
  test("a second click on bold takes the marks off", () => {
    const on = wrap("ab", 1, 1, "**");
    expect(on.text).toBe("a****b");
    expect(wrap(on.text, on.start, on.end, "**")).toEqual({
      text: "ab",
      start: 1,
      end: 1,
    });
  });
  test("code over several lines becomes a fenced block", () => {
    expect(wrapBlock("a\nb", 0, 3, "code").text).toBe("```\na\nb\n```");
    expect(wrapBlock("x", 0, 1, "math").text).toBe("$x$");
    expect(wrapBlock("a\nb", 0, 3, "math").text).toBe("$$\na\nb\n$$");
  });
});

describe("mathAt", () => {
  test("finds inline math around the caret, closed or still open", () => {
    const text = "la pérdida $L = x^2$ baja";
    expect(mathAt(text, 15)).toEqual({ tex: "L = x^2", display: false });
    expect(mathAt(text, 3)).toBeNull();
    expect(mathAt(text, text.length)).toBeNull();
    expect(mathAt("ver $\\frac{a}{b", 14)).toEqual({
      tex: "\\frac{a}{b",
      display: false,
    });
  });
  test("finds display math inside $$ blocks", () => {
    const text = "antes\n$$\n\\int_0^1 x\\,dx\n$$\ndespués";
    expect(mathAt(text, 12)).toEqual({
      tex: "\\int_0^1 x\\,dx",
      display: true,
    });
    expect(mathAt(text, 2)).toBeNull();
  });
  test("leaves prices and code alone", () => {
    expect(mathAt("cuesta $20", 10)).toBeNull();
    expect(mathAt("usa `$x$` aquí", 6)).toBeNull();
  });
});
