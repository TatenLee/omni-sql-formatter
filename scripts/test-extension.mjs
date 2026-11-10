import { resolve, join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { runTests } from "@vscode/test-electron";
const profile = await mkdtemp(join(tmpdir(), "sql-formatter-vscode-"));
try {
await runTests({
  version: "1.96.4",
  extensionDevelopmentPath: resolve("."),
  extensionTestsPath: resolve("tests/extension/suite.cjs"),
  launchArgs: ["--no-sandbox", "--disable-gpu", "--disable-workspace-trust", `--user-data-dir=${profile}`],
});
} finally {
  await rm(profile, { recursive: true, force: true });
}
