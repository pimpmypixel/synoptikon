import { spawn } from "child_process";
import { join } from "path";

// Start Motia backend on port 3002 (API + Workbench)
const backend = spawn("bun", ["run", "dev"], {
  cwd: join(import.meta.dir, "backend"),
  env: process.env,
  stdio: "inherit",
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  backend.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  backend.kill("SIGTERM");
  process.exit(0);
});
