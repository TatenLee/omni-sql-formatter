import * as vscode from "vscode";
import { formatSql } from "./formatter";
import { readSettings } from "./configuration";
import { registerDialectPicker } from "./dialectPicker";

export function activate(context: vscode.ExtensionContext): void {
  registerDialectPicker(context);
  context.subscriptions.push(vscode.commands.registerCommand("omniSqlFormatter.openSettings", async () => {
    await vscode.commands.executeCommand("workbench.action.openSettings", `@ext:${context.extension.id}`);
  },
  ));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(
    ["sql", "postgresql", "postgres"],
    {
      provideDocumentFormattingEdits(document, options, token) {
        if (token.isCancellationRequested) return [];
        const original = document.getText();
        if (original.trim().length === 0) return [];
        try {
          const configuration = vscode.workspace.getConfiguration("omniSqlFormatter", document.uri);
          const formatted = formatSql(original, readSettings(configuration, options));
          const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
          const result = formatted.replace(/\r?\n/g, eol) + (original.endsWith("\n") ? eol : "");
          if (result === original || token.isCancellationRequested) return [];
          return [vscode.TextEdit.replace(
            new vscode.Range(document.positionAt(0), document.positionAt(original.length)), result,
          )];
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          void vscode.window.showErrorMessage(`Omni SQL Formatter: ${error.message}`);
          return [];
        }
      },
    },
  ));
}
