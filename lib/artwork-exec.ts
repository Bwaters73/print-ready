import { spawn } from "node:child_process";
import { PROJECT_ROOT, PYTHON_BIN } from "@/lib/artwork-paths";
import { loadArtworkKeys } from "@/lib/artwork-env";

export type ExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

/** Runs the artwork-orchestrator venv's python with the given script + args, from
 * the project root (so all the skill's repo-root-relative paths resolve), with the
 * ai-images key file merged into env. */
export function runPython(scriptPath: string, args: string[], timeoutMs = 280_000): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(PYTHON_BIN, [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...loadArtworkKeys() },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: null, stdout, stderr: stderr + String(err) });
    });
  });
}
