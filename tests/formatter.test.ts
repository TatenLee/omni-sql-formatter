import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatSql as formatWithOptions } from "../src/formatter";
import type { LayoutOptions } from "../src/formatter";

const formatSql = (sql: string, options: LayoutOptions = {}) => formatWithOptions(sql, { dialect: "postgresql", ...options });

describe("PostgreSQL layout", () => {
  it("matches the reviewed full-query fixture", () => {
    const input = readFileSync(new URL("./fixtures/nested.input.sql", import.meta.url), "utf8");
    const expected = readFileSync(new URL("./fixtures/nested.expected.sql", import.meta.url), "utf8").trimEnd();
    const output = formatSql(input);
    expect(output).toBe(expected);
  });
  it("expands CASE when used as a function argument", () => {
    const input = "SELECT jsonb_array_elements(CASE WHEN x = 'array' THEN y ELSE '[]'::jsonb END) AS items FROM samples;";
    const output = formatSql(input);
    expect(output).toBe("SELECT\n\tjsonb_array_elements(\n\t\tCASE\n\t\t\tWHEN x = 'array' THEN y\n\t\t\tELSE '[]'::JSONB\n\t\tEND\n\t) AS items\nFROM\n\tsamples;");
  });

  it("expands derived tables when nested after FROM", () => {
    const input = "SELECT id FROM (SELECT id FROM samples) s;";
    const output = formatSql(input);
    expect(output).toBe("SELECT\n\tid\nFROM\n\t(\n\t\tSELECT\n\t\t\tid\n\t\tFROM\n\t\t\tsamples\n\t) s;");
  });

  it("puts the UPDATE target on the next line", () => {
    const output = formatSql("UPDATE t SET active = FALSE WHERE id = 1;");
    expect(output).toBe("UPDATE\n\tt\nSET\n\tactive = FALSE\nWHERE\n\tid = 1;");
  });

  it("keeps a grouped WHERE attached to its opening parenthesis", () => {
    const output = formatSql("SELECT id FROM t WHERE (a = 1 OR b = 2);", { newlineAfter: { WHERE: false } });
    expect(output).toContain("WHERE (\n\ta = 1\n\tOR b = 2\n)");
  });

  it("hugs parentheses around a CASE at the start of an argument line", () => {
    const output = formatSql("SELECT jsonb_typeof((CASE WHEN x THEN y ELSE z END));");
    expect(output).toBe("SELECT\n\tjsonb_typeof(\n\t\t(CASE\n\t\t\tWHEN x THEN y\n\t\t\tELSE z\n\t\tEND)\n\t);");
  });

  it("leaves ordinary ORDER BY expanded", () => {
    const output = formatSql("SELECT id FROM t ORDER BY id, name;");
    expect(output).toContain("ORDER BY\n\tid,\n\tname;");
  });

  it("keeps a short window inline when used in SELECT", () => {
    const input = "SELECT COUNT(*) OVER (PARTITION BY dataset_name, ref) AS ref_count FROM samples;";
    const output = formatSql(input);
    expect(output).toContain("COUNT(*) OVER (PARTITION BY dataset_name, ref) AS ref_count");
  });

  it("is stable when the full nested query is formatted again", () => {
    const input = readFileSync(new URL("./fixtures/nested.input.sql", import.meta.url), "utf8");
    const once = formatSql(input);
    const twice = formatSql(once);
    expect(twice).toBe(once);
  });

  it("preserves literals and quoted identifiers when they contain SQL keywords", () => {
    const input = `SELECT 'CASE WHEN FROM END' AS "MixedCase", $$FROM CASE\nEND$$ AS txt /* keep CASE */ FROM t;`;
    const output = formatSql(input);
    expect(output).toContain(`'CASE WHEN FROM END' AS "MixedCase"`);
    expect(output).toContain("$$FROM CASE\nEND$$");
    expect(output).toContain("/* keep CASE */");
  });

  it("uses editor indentation when spaces are requested", () => {
    const output = formatSql("SELECT id FROM t;", { insertSpaces: true, tabSize: 2 });
    expect(output).toBe("SELECT\n  id\nFROM\n  t;");
  });

  it("rejects unmatched parentheses instead of returning an edit", () => {
    expect(() => formatSql("SELECT (id FROM t;")).toThrow();
  });
});
