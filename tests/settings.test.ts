import { describe, expect, it } from "vitest";
import { formatSql } from "../src/formatter";
import { dialectNames } from "../src/settings";

describe("configurable layout", () => {
  it("keeps SELECT fields inline when clause breaks are disabled", () => {
    const result = formatSql("select a,b,c from t where x=1;", { newlineAfter: { SELECT: false, FROM: false, WHERE: false } });
    expect(result).toBe("SELECT a, b, c\nFROM t\nWHERE x = 1;");
  });
  it.each(["upper", "lower", "preserve"] as const)("uses independent %s keyword casing", keywordCase => {
    const result = formatSql("select a FrOm t", { keywordCase });
    expect(result).toBe(keywordCase === "upper" ? "SELECT\n\ta\nFROM\n\tt" : keywordCase === "lower" ? "select\n\ta\nfrom\n\tt" : "select\n\ta\nFrOm\n\tt");
  });
  it("keeps datatype casing independent from keyword casing", () => {
    const result = formatSql("select cast(x as varchar(10)) from t;", { keywordCase: "lower", dataTypeCase: "upper" });
    expect(result).toContain("cast(x as VARCHAR(10))");
    expect(result).toContain("from\n");
  });
  it("recognizes custom keywords while protecting comments and strings", () => {
    const result = formatSql("select customword, 'customword', \"customword\" from t -- customword", { keywordInclude: ["customword"] });
    expect(result).toContain("CUSTOMWORD,");
    expect(result).toContain("'customword'");
    expect(result).toContain('"customword"');
    expect(result).toContain("-- customword");
  });
  it("gives keyword exclusion precedence over inclusion", () => {
    const result = formatSql("select customword as x from t", { keywordInclude: ["customword"], keywordExclude: ["customword", "as"] });
    expect(result).toContain("customword as x");
  });
  it("excludes hardcoded CASE tokens when they are identifiers", () => {
    const result = formatSql("select case from t", { keywordExclude: ["CASE"] });
    expect(result).toBe("SELECT\n\tcase\nFROM\n\tt");
  });
  it("recognizes custom types and excludes a built-in type", () => {
    const result = formatSql("select cast(x as customtype), cast(y as varchar(4)) from t", { dataTypeInclude: ["customtype"], dataTypeExclude: ["varchar"] });
    expect(result).toContain("AS CUSTOMTYPE)");
    expect(result).toContain("AS varchar (4))");
  });
  it("gives type exclusion precedence over inclusion", () => {
    const result = formatSql("select cast(x as CustomType)", { dataTypeInclude: ["CUSTOMTYPE"], dataTypeExclude: ["customtype"] });
    expect(result).toContain("AS CustomType)");
  });
  it("preserves excluded built-in types even if they also occur in the keyword dictionary", () => {
    const result = formatSql("select cast(x as boolean)", { dataTypeExclude: ["boolean"] });
    expect(result).toContain("AS boolean)");
  });
  it("recognizes multiword includes and prioritizes types over keywords", () => {
    const result = formatSql("select cast(x as custom type), custom flag from t", {
      keywordInclude: ["custom type", "custom flag"], dataTypeInclude: ["custom type"], dataTypeCase: "lower",
    });
    expect(result).toContain("AS custom type)");
    expect(result).toContain("CUSTOM FLAG");
  });
  it("does not merge a line comment with a following CASE branch", () => {
    const result = formatSql("select case when a then b -- keep\nelse c end from t", { newlineAfter: { CASE: false } });
    expect(result).toMatch(/-- keep\n\s*ELSE c/);
  });
  it.each(["tabs", "spaces", "none"] as const)("uses %s indentation independently of editor settings", indentStyle => {
    const result = formatSql("select a from t", { indentStyle, indentSize: 3, insertSpaces: true, tabSize: 2 });
    const indent = indentStyle === "tabs" ? "\t" : indentStyle === "spaces" ? "   " : "";
    expect(result).toBe(`SELECT\n${indent}a\nFROM\n${indent}t`);
  });
  it("keeps CASE inline when its break switch is disabled", () => {
    const result = formatSql("select case when a then b else c end as x from t", { newlineAfter: { CASE: false } });
    expect(result).toContain("CASE WHEN a THEN b ELSE c END AS x");
  });
  it("breaks after WHEN, THEN, ELSE and END independently", () => {
    const result = formatSql("select case when a then b else c end as x from t", { newlineAfter: { WHEN: true, THEN: true, ELSE: true, END: true } });
    expect(result).toContain("WHEN\n\t\t\ta THEN\n\t\t\tb");
    expect(result).toContain("ELSE\n\t\t\tc");
    expect(result).toContain("END\n\tAS x");
  });
  it("keeps LIMIT inline when disabled", () => {
    const result = formatSql("select a from t limit 10", { newlineAfter: { LIMIT: false } });
    expect(result).toContain("LIMIT 10");
  });
  it("changes INSERT INTO as a complete clause", () => {
    const result = formatSql("insert into t(a) values(1)", { newlineAfter: { INSERT: true } });
    expect(result).toContain("INSERT INTO\n");
  });
  it("controls the blank lines between statements", () => {
    expect(formatSql("select 1; select 2;", { linesBetweenQueries: 0 })).toBe("SELECT\n\t1;\nSELECT\n\t2;");
  });
  it.each(dialectNames)("uses shared layout in %s", dialect => {
    expect(formatSql("select a,b from t", { dialect, newlineAfter: { SELECT: false, FROM: false } })).toBe("SELECT a, b\nFROM t");
  });
  it.each(["mysql", "hive", "spark"] as const)("preserves backtick identifiers in %s", dialect => {
    expect(formatSql("select `MixedCase` from `table`", { dialect })).toContain("`MixedCase`");
  });
  it("keeps configurable CASE output idempotent", () => {
    const options = { newlineAfter: { WHEN: true, THEN: true, ELSE: true, END: true } };
    const once = formatSql("select case when a then b else c end as x from t", options);
    expect(formatSql(once, options)).toBe(once);
  });
});
