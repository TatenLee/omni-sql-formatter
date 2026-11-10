import { describe, expect, it } from "vitest";
import { formatSql } from "../src/formatter";
import { formatHint } from "../src/hints";

describe("SELECT hints", () => {
  it("formats assignment hints alongside SELECT", () => {
    const result = formatSql("select /*prefix=xxx,xiw = gzk, postfix=1*/ a,b from t");
    expect(result).toBe("SELECT /* prefix=xxx, xiw=gzk, postfix=1 */\n\ta,\n\tb\nFROM\n\tt");
  });
  it("keeps the select list inline when its newline is disabled", () => {
    const result = formatSql("select /*a = 1,b=2*/ x,y from t", { newlineAfter: { SELECT: false } });
    expect(result).toContain("SELECT /* a=1, b=2 */ x, y");
  });
  it("puts hints on a separate indented line when configured", () => {
    const result = formatSql("SELECT /*a=1*/ x FROM t", { hintsPlacement: "nextLine" });
    expect(result).toBe("SELECT\n\t/* a=1 */\n\tx\nFROM\n\tt");
  });
  it("formats Lindorm optimizer functions without removing the plus marker", () => {
    const result = formatSql("SELECT /*+_l_operation_timeout_( 1000 ),_l_force_index_('idx1')*/ * FROM t");
    expect(result).toContain("SELECT /*+ _l_operation_timeout_(1000), _l_force_index_('idx1') */");
  });
  it("formats JSON/Python containers without changing strings or tuple commas", () => {
    const result = formatHint(`/*cfg={"items":[1,2], 'tag':'a, b = c'}, pair=(1,), enabled=True*/`, { formatContent: true });
    expect(result).toBe(`/* cfg={"items": [1, 2], 'tag': 'a, b = c'}, pair=(1,), enabled=True */`);
  });
  it("preserves escaped and doubled quote contents", () => {
    const input = String.raw`/*a='it''s, fine', b="x\" , =y"*/`;
    expect(formatHint(input, { formatContent: true })).toBe(String.raw`/* a='it''s, fine', b="x\" , =y" */`);
  });
  it("can keep recognized hint content unchanged", () => {
    const result = formatSql("SELECT /*a = 1,b=2*/ x", { hintsFormatContent: false });
    expect(result).toBe("SELECT /*a = 1,b=2*/\n\tx");
  });
  it("can disable hint handling", () => {
    const result = formatSql("SELECT /*a = 1,b=2*/ x", { hintsEnabled: false });
    expect(result).toContain("/*a = 1,b=2*/");
    expect(result).not.toContain("SELECT /*");
  });
  it("leaves ordinary comments unchanged", () => {
    const result = formatSql("SELECT /* explain this,  do not rewrite */ x FROM t");
    expect(result).toContain("/* explain this,  do not rewrite */");
  });
  it("leaves hint-like text inside strings unchanged", () => {
    expect(formatSql("SELECT 'SELECT /*a = b,c=d*/' AS x")).toContain("'SELECT /*a = b,c=d*/'");
  });
  it.each(["/*a='unterminated*/", "/*a=[1,2*/", "/*a=https://example.com*/", "/*a=f(x + y)*/", "/*a=1,b=*/"])("preserves unsupported content: %s", input => {
    expect(formatSql(`SELECT ${input} x`)).toContain(input);
  });
  it("preserves unsupported optimizer content but keeps its position", () => {
    const result = formatSql("SELECT /*+ INDEX(t idx) */ x FROM t");
    expect(result).toContain("SELECT /*+ INDEX(t idx) */");
  });
  it("preserves multiline content in an unsupported assignment hint", () => {
    const hint = "/*a=f('first\n   second')*/";
    expect(formatSql(`SELECT ${hint} x FROM t`)).toContain(hint);
  });
  it("keeps hints before DISTINCT in their original token order", () => {
    const result = formatSql("SELECT /*a=1*/ DISTINCT x FROM t");
    expect(result).toContain("SELECT /* a=1 */\n\tDISTINCT x");
  });
  it("does not relocate comments that are not immediately after SELECT", () => {
    expect(formatSql("SELECT x /*a = b,c=d*/ FROM t")).toContain("x /*a = b,c=d*/");
  });
  it.each(["sameLine", "nextLine"] as const)("is idempotent in nested SELECTs with %s hints", hintsPlacement => {
    const input = "SELECT /*a=1*/ x FROM (SELECT /*b=2*/ x FROM t) s";
    const once = formatSql(input, { hintsPlacement });
    expect(formatSql(once, { hintsPlacement })).toBe(once);
  });
  it("retains all consecutive hints", () => {
    const result = formatSql("SELECT /*a=1*/ /*+ _l_ignore_index_ */ x FROM t");
    expect(result).toContain("SELECT /* a=1 */ /*+ _l_ignore_index_ */");
  });
});
