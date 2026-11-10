import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  status: { text: "", name: "", command: "", tooltip: "", show: vi.fn(), hide: vi.fn() },
  config: { get: vi.fn(() => "sql"), update: vi.fn() },
  editor: { document: { uri: { path: "/query.sql" }, languageId: "sql" } },
  folder: undefined as object | undefined,
  pick: vi.fn(),
  command: undefined as (() => Promise<void>) | undefined,
  refresh: undefined as (() => void) | undefined,
}));
vi.mock("vscode", () => ({
  StatusBarAlignment: { Right: 2 },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  window: {
    get activeTextEditor() { return mock.editor; },
    createStatusBarItem: () => mock.status,
    onDidChangeActiveTextEditor: (callback: () => void) => { mock.refresh = callback; },
    showQuickPick: mock.pick,
    showErrorMessage: vi.fn(),
  },
  workspace: {
    getConfiguration: () => mock.config,
    getWorkspaceFolder: () => mock.folder,
    onDidOpenTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  commands: { registerCommand: (_: string, callback: () => Promise<void>) => { mock.command = callback; } },
}));
import { registerDialectPicker } from "../src/dialectPicker";
import type { ExtensionContext } from "vscode";

beforeEach(() => {
  vi.clearAllMocks();
  mock.folder = undefined;
  mock.editor.document.languageId = "sql";
  mock.config.get.mockReturnValue("sql");
  mock.pick.mockResolvedValue(undefined);
  registerDialectPicker({ subscriptions: [] } as unknown as ExtensionContext);
});

it("shows the effective dialect and hides for other languages", () => {
  expect(mock.status.text).toBe("Dialect: sql");
  mock.config.get.mockReturnValue("postgresql");
  mock.refresh!();
  expect(mock.status.text).toBe("Dialect: postgresql");
  mock.editor.document.languageId = "typescript";
  mock.refresh!();
  expect(mock.status.hide).toHaveBeenCalled();
});

it("keeps cancellation read-only and places the current dialect first", async () => {
  mock.config.get.mockReturnValue("postgresql");
  await mock.command!();
  expect(mock.pick.mock.calls[0]![0][0]).toEqual({ label: "postgresql", description: "Current" });
  expect(mock.config.update).not.toHaveBeenCalled();
});

it("saves to the active workspace folder", async () => {
  mock.folder = {};
  mock.pick.mockResolvedValue({ label: "postgresql" });
  await mock.command!();
  expect(mock.config.update).toHaveBeenCalledWith("dialect", "postgresql", 3);
});

it("saves to user settings without a workspace", async () => {
  mock.pick.mockResolvedValue({ label: "mysql" });
  await mock.command!();
  expect(mock.config.update).toHaveBeenCalledWith("dialect", "mysql", 1);
});
