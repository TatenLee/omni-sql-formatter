import * as vscode from "vscode";
import { dialectNames } from "./settings";

export function registerDialectPicker(context: vscode.ExtensionContext): void {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.name = "Omni SQL Formatter Dialect";
  status.command = "omniSqlFormatter.changeDialect";
  status.tooltip = "Omni SQL Formatter: change dialect";
  const refresh = (): void => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || !["sql", "postgresql", "postgres"].includes(document.languageId)) {
      status.hide();
      return;
    }
    const config = vscode.workspace.getConfiguration("omniSqlFormatter", document.uri);
    status.text = `Dialect: ${config.get<string>("dialect", "sql")}`;
    status.show();
  };
  context.subscriptions.push(
    status,
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeConfiguration(refresh),
    vscode.commands.registerCommand("omniSqlFormatter.changeDialect", async () => {
      // Capture the resource before the picker opens, even if the editor changes later.
      const uri = vscode.window.activeTextEditor?.document.uri;
      const config = vscode.workspace.getConfiguration("omniSqlFormatter", uri);
      const current = config.get<string>("dialect", "sql");
      const folder = uri ? vscode.workspace.getWorkspaceFolder(uri) : undefined;
      const target = folder ? vscode.ConfigurationTarget.WorkspaceFolder
        : vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
      const scope = folder ? "workspace folder" : target === vscode.ConfigurationTarget.Workspace ? "workspace" : "user settings";
      const items = [...dialectNames].sort((a, b) => Number(b === current) - Number(a === current))
        .map(label => ({ label, description: label === current ? "Current" : "" }));
      const selected = await vscode.window.showQuickPick(items, {
        title: "Omni SQL Formatter: change dialect",
        placeHolder: `Select dialect (${scope})`,
      });
      if (!selected) return;
      try {
        await config.update("dialect", selected.label, target);
        refresh();
      } catch (error) {
        void vscode.window.showErrorMessage(`Omni SQL Formatter: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
  refresh();
}
