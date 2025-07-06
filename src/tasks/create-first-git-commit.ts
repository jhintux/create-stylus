import { execa } from "execa";
import { Options } from "../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createFirstGitCommit(targetDir: string, options: Options) {
  try {
    await execa("git", ["add", "-A"], { cwd: targetDir });
    await execa("git", ["commit", "-m", "Initial commit with 🏗️ Scaffold-Stylus", "--no-verify"], { cwd: targetDir });
  } catch (e: any) {
    // cast error as ExecaError to get stderr
    throw new Error("Failed to initialize git repository", {
      cause: e?.stderr ?? e,
    });
  }
}
