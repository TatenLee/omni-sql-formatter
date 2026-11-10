import * as sqlFormatter from "sql-formatter";
import type { DialectOptions } from "sql-formatter";
import type { Settings } from "./settings";

const canonical = (word: string): string => word.trim().replace(/ +/g, " ").toUpperCase();

export function createCustomDialect(config: Settings): DialectOptions {
  const base = sqlFormatter[config.dialect];
  const keywordExclude = new Set(config.keywordExclude.map(canonical));
  const typeExclude = new Set(config.dataTypeExclude.map(canonical));
  const typeInclude = new Set(config.dataTypeInclude.map(canonical).filter(word => !typeExclude.has(word)));
  const keywordInclude = config.keywordInclude.map(canonical).filter(word => !keywordExclude.has(word) && !typeInclude.has(word));
  const keepKeyword = (word: string): boolean => !typeInclude.has(word);
  const keepType = (word: string): boolean => !keywordInclude.includes(word);
  const tokenizer = base.tokenizerOptions;
  return {
    ...base,
    tokenizerOptions: {
      ...tokenizer,
      omniKeywordExclude: [...keywordExclude],
      omniDataTypeExclude: [...typeExclude],
      reservedSelect: tokenizer.reservedSelect.filter(keepKeyword),
      reservedClauses: tokenizer.reservedClauses.filter(keepKeyword),
      reservedSetOperations: tokenizer.reservedSetOperations.filter(keepKeyword),
      reservedJoins: tokenizer.reservedJoins.filter(keepKeyword),
      reservedFunctionNames: tokenizer.reservedFunctionNames.filter(keepKeyword),
      reservedKeywords: [...tokenizer.reservedKeywords.filter(keepKeyword), ...keywordInclude.filter(word => !word.includes(" "))],
      reservedKeywordPhrases: [...(tokenizer.reservedKeywordPhrases ?? []).filter(keepKeyword), ...keywordInclude.filter(word => word.includes(" "))],
      reservedDataTypes: [...tokenizer.reservedDataTypes.filter(keepType), ...[...typeInclude].filter(word => !word.includes(" "))],
      reservedDataTypePhrases: [...(tokenizer.reservedDataTypePhrases ?? []).filter(keepType), ...[...typeInclude].filter(word => word.includes(" "))],
    },
  };
}
