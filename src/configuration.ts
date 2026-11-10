import type { FormattingOptions, WorkspaceConfiguration } from "vscode";
import { breakDefaults, optionsSchema } from "./settings";
import type { Settings } from "./settings";

export function readSettings(configuration: WorkspaceConfiguration, editor: FormattingOptions): Settings {
  return optionsSchema.parse({
    dialect: configuration.get("dialect"),
    keywordCase: configuration.get("keywords.case"),
    keywordInclude: configuration.get("keywords.include"),
    keywordExclude: configuration.get("keywords.exclude"),
    dataTypeCase: configuration.get("dataTypes.case"),
    dataTypeInclude: configuration.get("dataTypes.include"),
    dataTypeExclude: configuration.get("dataTypes.exclude"),
    newlineAfter: Object.fromEntries(Object.entries(breakDefaults).map(([keyword, fallback]) => [
      keyword, configuration.get(`newlineAfter.${keyword.toLowerCase().replaceAll(" ", "_")}`, fallback),
    ])),
    indentStyle: configuration.get("indentation.style"),
    indentSize: configuration.get("indentation.size"),
    insertSpaces: editor.insertSpaces,
    tabSize: editor.tabSize,
    expressionWidth: configuration.get("expressionWidth"),
    linesBetweenQueries: configuration.get("linesBetweenQueries"),
    hintsEnabled: configuration.get("hints.enabled"),
    hintsPlacement: configuration.get("hints.placement"),
    hintsFormatContent: configuration.get("hints.formatContent"),
  });
}
