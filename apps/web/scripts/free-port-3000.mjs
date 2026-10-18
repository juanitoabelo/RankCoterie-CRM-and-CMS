import { execSync } from "node:child_process";

function main() {
  const port = process.env.PORT ?? "3000";
  const commands = [`lsof -ti tcp:${port}`, `fuser ${port}/tcp`];

  for (const command of commands) {
    try {
      const out = execSync(command, { encoding: "utf8" });
      const pids = out.split(/\s+/).filter(Boolean);
      if (pids.length) {
        execSync(`kill -9 ${pids.join(" ")}`, { stdio: "ignore" });
      }
      return;
    } catch {
      // command/utility not available; try the next one
    }
  }
}

main();