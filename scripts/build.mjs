import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const formatterRoot = dirname(require.resolve("sql-formatter/package.json"));
const nearleyEntry = createRequire(join(formatterRoot, "package.json")).resolve("nearley");
const licenses = [
  ["sql-formatter 15.9.0 (MIT; locally patched)", join(formatterRoot, "LICENSE")],
  ["zod 4.3.6 (MIT)", join(dirname(require.resolve("zod/package.json")), "LICENSE")],
  ["nearley 2.20.1 (MIT)", join(dirname(nearleyEntry), "../LICENSE.txt")],
];
const notices = await Promise.all(licenses.map(async ([name, path]) =>
  `## ${name}\n\n${await readFile(path, "utf8")}`));
await writeFile("THIRD_PARTY_NOTICES.md", `# Bundled dependencies\n\n${notices.join("\n\n")}`);
await build({
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  legalComments: "eof",
});
