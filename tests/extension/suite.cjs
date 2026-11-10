const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");

exports.run = async function () {
  const manifest = require("../../package.json");
  const extension = vscode.extensions.getExtension(`${manifest.publisher}.${manifest.name}`);
  assert.ok(extension, "extension must be discoverable");
  await extension.activate();
  const configuration = vscode.workspace.getConfiguration("omniSqlFormatter");
  assert.equal(extension.packageJSON.contributes.configuration.length, 6);
  assert.equal(configuration.inspect("dialect").defaultValue, "sql");
  assert.equal(configuration.inspect("keywords.case").defaultValue, "upper");
  assert.equal(configuration.inspect("newlineAfter.select").defaultValue, true);
  assert.equal(configuration.inspect("hints.placement").defaultValue, "sameLine");
  await vscode.commands.executeCommand("omniSqlFormatter.openSettings");
  await configuration.update("dialect", "postgresql", vscode.ConfigurationTarget.Global);
  for (const [input, expected] of [
    [readFileSync(join(__dirname, "../fixtures/nested.input.sql"), "utf8"),
      readFileSync(join(__dirname, "../fixtures/nested.expected.sql"), "utf8")],
    ["SELECT id FROM t;", "SELECT\n\tid\nFROM\n\tt;"],
    ["SELECT /*prefix=xxx,xiw = gzk, postfix=1*/ x FROM t;", "SELECT /* prefix=xxx, xiw=gzk, postfix=1 */\n\tx\nFROM\n\tt;"],
    ["SELECT CASE WHEN x THEN y ELSE z END FROM t;", "SELECT\n\tCASE\n\t\tWHEN x THEN y\n\t\tELSE z\n\tEND\nFROM\n\tt;"],
    ["SELECT (id FROM t;", "SELECT (id FROM t;"],
    ["\n\n", "\n\n"],
    ["SELECT id\r\nFROM t;\r\n", "SELECT\r\n\tid\r\nFROM\r\n\tt;\r\n"],
  ]) {
    const document = await vscode.workspace.openTextDocument({ language: "sql", content: input });
    await vscode.window.showTextDocument(document);
    const edits = await vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", document.uri, {
      insertSpaces: false, tabSize: 4,
    });
    if (edits && edits.length > 0) {
      const change = new vscode.WorkspaceEdit();
      change.set(document.uri, edits);
      assert.equal(await vscode.workspace.applyEdit(change), true, `apply edit: ${input.slice(0, 40)}`);
    }
    assert.equal(document.getText(), expected);
  }
  const settings = {
    dialect: "mysql", "keywords.case": "lower", "dataTypes.case": "lower",
    "keywords.include": ["CUSTOMWORD"], "keywords.exclude": ["AS"],
    "dataTypes.include": ["CUSTOMTYPE"], "dataTypes.exclude": ["VARCHAR"],
    "newlineAfter.select": false, "newlineAfter.from": false,
    "indentation.style": "none", "indentation.size": 3,
    "hints.placement": "nextLine",
  };
  for (const [key, value] of Object.entries(settings)) {
    await configuration.update(key, value, vscode.ConfigurationTarget.Global);
  }
  const custom = await vscode.workspace.openTextDocument({ language: "sql", content: "SELECT CUSTOMWORD AS x, CAST(y AS CUSTOMTYPE), CAST(z AS VARCHAR(2)) FROM `T`;" });
  await vscode.window.showTextDocument(custom);
  const edits = await vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", custom.uri, { insertSpaces: false, tabSize: 4 });
  assert.ok(edits.length > 0);
  const change = new vscode.WorkspaceEdit();
  change.set(custom.uri, edits);
  assert.equal(await vscode.workspace.applyEdit(change), true);
  assert.equal(custom.getText(), "select customword AS x, CAST(y AS customtype), CAST(z AS VARCHAR (2))\nfrom `T`;");
  const hintDocument = await vscode.workspace.openTextDocument({ language: "sql", content: "SELECT /*prefix=xxx,xiw = gzk*/ x FROM t" });
  await vscode.window.showTextDocument(hintDocument);
  const hintEdits = await vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", hintDocument.uri, { insertSpaces: true, tabSize: 2 });
  const hintChange = new vscode.WorkspaceEdit();
  hintChange.set(hintDocument.uri, hintEdits);
  assert.equal(await vscode.workspace.applyEdit(hintChange), true);
  assert.equal(hintDocument.getText(), "select\n/* prefix=xxx, xiw=gzk */ x\nfrom t");
  for (const key of Object.keys(settings)) await configuration.update(key, undefined, vscode.ConfigurationTarget.Global);
  console.log("Extension host: settings registration, live configuration, formatting, error preservation and CRLF passed");
};
