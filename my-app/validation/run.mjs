// 검증 스크립트 실행기: validation/scripts/*.ts를 임시 폴더로 컴파일한 뒤 node로 실행한다.
// 사용: node validation/run.mjs <script-name> [args...]   (cwd = my-app)
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const [name, ...args] = process.argv.slice(2);
if (!name) {
  console.error("사용법: node validation/run.mjs <script-name> [args...]");
  process.exit(2);
}

const output = mkdtempSync(join(tmpdir(), "self-layers-validation-"));
try {
  const compile = spawnSync(process.execPath, [
    join(root, "node_modules/typescript/bin/tsc"),
    "--project", "validation/tsconfig.validation.json", "--outDir", output,
  ], { cwd: root, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) {
    process.exitCode = compile.status ?? 1;
  } else {
    const script = join(output, "validation", "scripts", `${name}.js`);
    if (!existsSync(script)) {
      console.error(`스크립트가 없습니다: validation/scripts/${name}.ts`);
      process.exitCode = 2;
    } else {
      const run = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: "inherit" });
      if (run.error) throw run.error;
      process.exitCode = run.status ?? 1;
    }
  }
} finally {
  // mkdtempSync가 돌려준 임시 폴더만 지운다.
  rmSync(output, { recursive: true, force: true });
}
