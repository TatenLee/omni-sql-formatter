type HintToken = { readonly text: string; readonly kind: "word" | "quoted" | "punctuation" };
type HintOptions = { readonly formatContent: boolean };

function tokenize(body: string): HintToken[] | undefined {
  const tokens: HintToken[] = [];
  for (let offset = 0; offset < body.length;) {
    const rest = body.slice(offset);
    const whitespace = /^\s+/.exec(rest)?.[0];
    if (whitespace) { offset += whitespace.length; continue; }
    const quote = rest[0];
    if (quote === "'" || quote === '"') {
      let end = offset + 1;
      let closed = false;
      for (; end < body.length; end++) {
        if (body[end] === "\\") { end++; continue; }
        if (body[end] === quote) {
          if (body[end + 1] === quote) { end++; continue; }
          closed = true; end++; break;
        }
      }
      if (!closed) return undefined;
      tokens.push({ text: body.slice(offset, end), kind: "quoted" });
      offset = end;
      continue;
    }
    const word = /^(?:[A-Za-z_][A-Za-z_0-9.@-]*|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(rest)?.[0];
    if (word) {
      tokens.push({ text: word, kind: "word" }); offset += word.length; continue;
    }
    if (quote && "=,:()[]{}".includes(quote)) {
      tokens.push({ text: quote, kind: "punctuation" }); offset++; continue;
    }
    return undefined;
  }
  return tokens;
}

class HintParser {
  private index = 0;
  constructor(private readonly tokens: readonly HintToken[]) {}

  parse(optimizer: boolean): string | undefined {
    const items: string[] = [];
    do {
      const name = this.tokens[this.index++];
      if (!name || name.kind !== "word" || !/^[A-Za-z_][A-Za-z_0-9.@-]*$/.test(name.text)) return undefined;
      if (this.consume("=")) {
        const value = this.value(0);
        if (value === undefined) return undefined;
        items.push(`${name.text}=${value}`);
      } else if (optimizer && this.peek() === "(") {
        const args = this.value(0);
        if (args === undefined) return undefined;
        items.push(name.text + args);
      } else if (optimizer) {
        items.push(name.text);
      } else {
        return undefined;
      }
    } while (this.consume(","));
    return this.index === this.tokens.length ? items.join(", ") : undefined;
  }

  private value(depth: number): string | undefined {
    if (depth > 64) return undefined;
    const token = this.tokens[this.index++];
    if (!token) return undefined;
    if (token.kind === "quoted" || token.kind === "word") return token.text;
    const close = token.text === "(" ? ")" : token.text === "[" ? "]" : token.text === "{" ? "}" : undefined;
    if (!close) return undefined;
    const items: string[] = [];
    let trailingComma = false;
    while (!this.consume(close)) {
      const item = this.value(depth + 1);
      if (item === undefined) return undefined;
      if (token.text === "{" && this.consume(":")) {
        const value = this.value(depth + 1);
        if (value === undefined) return undefined;
        items.push(`${item}: ${value}`);
      } else {
        items.push(item);
      }
      if (this.peek() !== close) {
        if (!this.consume(",")) return undefined;
        trailingComma = this.peek() === close;
      }
    }
    // Keep trailing commas: in Python, (1,) and (1) have different meanings.
    return token.text + items.join(", ") + (trailingComma ? "," : "") + close;
  }

  private peek(): string | undefined { return this.tokens[this.index]?.text; }
  private consume(text: string): boolean {
    if (this.peek() !== text) return false;
    this.index++;
    return true;
  }
}

export function formatHint(comment: string, options: HintOptions): string | undefined {
  if (!comment.startsWith("/*") || !comment.endsWith("*/")) return undefined;
  const optimizer = comment.startsWith("/*+");
  const body = comment.slice(optimizer ? 3 : 2, -2).trim();
  if (!optimizer && !/^[A-Za-z_][A-Za-z_0-9.@-]*\s*=/.test(body)) return undefined;
  const tokens = tokenize(body);
  const formatted = tokens ? new HintParser(tokens).parse(optimizer) : undefined;
  if (formatted === undefined) return comment;
  return options.formatContent ? `/*${optimizer ? "+" : ""} ${formatted} */` : comment;
}
