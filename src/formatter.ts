import { formatDialect } from "sql-formatter";
import { createCustomDialect } from "./dialect";
import { formatHint } from "./hints";
import { breakDefaults, optionsSchema } from "./settings";
import type { LayoutOptions } from "./settings";
export type { LayoutOptions } from "./settings";

export function formatSql(sql: string, options: LayoutOptions = {}): string {
  const config = optionsSchema.parse(options);
  if (sql.trim().length === 0) return sql;
  const newlineAfter = Object.fromEntries(Object.entries(config.newlineAfter).map(([key, value]) => [key.trim().toUpperCase(), value]));
  const useTabs = config.indentStyle === "tabs" || (config.indentStyle === "editor" && !config.insertSpaces);
  const tabWidth = config.indentStyle === "none" ? 0 : config.indentStyle === "editor" ? config.tabSize : config.indentSize;
  const formatOptions = {
    dialect: createCustomDialect(config),
    keywordCase: config.keywordCase,
    dataTypeCase: config.dataTypeCase,
    useTabs,
    tabWidth,
    expressionWidth: config.expressionWidth,
    linesBetweenQueries: config.linesBetweenQueries,
    omniNewlineAfter: { ...breakDefaults, ...newlineAfter },
    omniFormatHint: config.hintsEnabled ? (text: string) => formatHint(text, { formatContent: config.hintsFormatContent }) : undefined,
    omniHintPlacement: config.hintsPlacement,
  };
  return formatDialect(sql, formatOptions);
}
