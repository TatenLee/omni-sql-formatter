import { z } from "zod";

export const dialectNames = ["sql", "postgresql", "mysql", "mariadb", "hive", "spark", "bigquery", "clickhouse", "duckdb", "sqlite", "transactsql", "trino", "snowflake", "redshift", "plsql", "db2", "db2i", "tidb", "n1ql", "singlestoredb"] as const;
export const breakDefaults = {
  SELECT: true, UPDATE: true, INSERT: false, SET: true, VALUES: true,
  FROM: true, WHERE: true, "GROUP BY": true, "ORDER BY": true,
  HAVING: true, LIMIT: true, OFFSET: true, RETURNING: true,
  CASE: true, WHEN: false, THEN: false, ELSE: false, END: false,
} as const;
const casing = z.enum(["upper", "lower", "preserve"]);
const words = z.array(z.string()).max(500)
  .transform(items => [...new Set(items.flatMap(item => item.split(/[,，]/))
    .map(word => word.trim().replace(/ +/g, " ").toUpperCase()).filter(Boolean))])
  .pipe(z.array(z.string().regex(/^[A-Z_][A-Z_0-9]*(?: +[A-Z_][A-Z_0-9]*)*$/)).max(500));
export const optionsSchema = z.object({
  dialect: z.enum(dialectNames).default("sql"),
  keywordCase: casing.default("upper"),
  keywordInclude: words.default([]),
  keywordExclude: words.default([]),
  dataTypeCase: casing.default("upper"),
  dataTypeInclude: words.default([]),
  dataTypeExclude: words.default([]),
  newlineAfter: z.record(z.string(), z.boolean()).default({}),
  indentStyle: z.enum(["editor", "tabs", "spaces", "none"]).default("editor"),
  indentSize: z.number().int().min(1).max(16).default(4),
  insertSpaces: z.boolean().default(false),
  tabSize: z.number().int().min(1).max(16).default(4),
  expressionWidth: z.number().int().min(1).max(1000).default(100),
  linesBetweenQueries: z.number().int().min(0).max(5).default(1),
  hintsEnabled: z.boolean().default(true),
  hintsPlacement: z.enum(["sameLine", "nextLine"]).default("sameLine"),
  hintsFormatContent: z.boolean().default(true),
});
export type LayoutOptions = z.input<typeof optionsSchema>;
export type Settings = z.output<typeof optionsSchema>;
