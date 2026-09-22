import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(join(tmpdir(), "self-layers-tests-"));
try {
  const compile = spawnSync(process.execPath, [
    join(root, "node_modules/typescript/bin/tsc"),
    "--project", "tsconfig.test.json", "--outDir", output,
  ], { cwd: root, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) {
    process.exitCode = compile.status ?? 1;
  } else {
    const testFiles = readdirSync(join(output, "lib")).filter((name) => name.endsWith(".test.js")).map((name) => join(output, "lib", name));
    const test = spawnSync(process.execPath, ["--test", ...testFiles], {
      cwd: root, stdio: "inherit",
    });
    if (test.error) throw test.error;
    process.exitCode = test.status ?? 1;
  }
} finally {
  // Only remove the exact temporary directory returned by mkdtempSync above.
  rmSync(output, { recursive: true, force: true });
}
