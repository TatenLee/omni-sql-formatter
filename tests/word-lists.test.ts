import { describe, expect, it } from "vitest";
import { formatSql } from "../src/formatter";
import { optionsSchema } from "../src/settings";

describe("word list input", () => {
  it.each(["keywordInclude", "keywordExclude", "dataTypeInclude", "dataTypeExclude"] as const)("normalizes comma-separated %s entries", key => {
    const result = optionsSchema.parse({ [key]: [" foo, Bar，FOO ", "custom  type", " , "] });
    expect(result[key]).toEqual(["FOO", "BAR", "CUSTOM TYPE"]);
  });
  it("matches keyword includes and excludes without case sensitivity", () => {
    const result = formatSql("select Foo, bar, baz from t", {
      keywordInclude: ["foo，BAR, Baz"], keywordExclude: ["bAr, BAZ"],
    });
    expect(result).toBe("SELECT\n\tFOO,\n\tbar,\n\tbaz\nFROM\n\tt");
  });
  it("matches type includes and excludes without case sensitivity", () => {
    const result = formatSql("select cast(x as CustomType), cast(y as varchar)", {
      dataTypeInclude: ["customtype, VARCHAR"], dataTypeExclude: ["VaRcHaR，unused"],
    });
    expect(result).toBe("SELECT\n\tcast(x AS CUSTOMTYPE),\n\tcast(y AS varchar)");
  });
  it("rejects invalid entries after splitting", () => {
    expect(() => optionsSchema.parse({ keywordInclude: ["valid, invalid!"] })).toThrow();
  });
});
