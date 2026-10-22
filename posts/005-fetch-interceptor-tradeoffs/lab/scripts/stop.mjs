// Encerra tudo do lab: API (4191, e 4192 usada pelo benchmark), servidor da web (4180) e qualquer benchmark em andamento.
// Uso: node scripts/stop.mjs [--dry]  (--dry só lista o que seria encerrado)
import { execFileSync } from "node:child_process";

const dry = process.argv.includes("--dry");
const out = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch {
    return []; // lsof e pgrep saem com 1 quando não acham nada
  }
};

const pids = new Set([
  ...[4180, 4191, 4192].flatMap((port) => out("lsof", ["-nP", "-tiTCP:" + port, "-sTCP:LISTEN"])),
  ...out("pgrep", ["-f", "scripts/benchmark.mjs"]),
]);
pids.delete(String(process.pid));

if (!pids.size) console.log("nada rodando");
for (const pid of pids) {
  const [cmd] = out("ps", ["-o", "command=", "-p", pid]);
  console.log(`${dry ? "encerraria" : "encerrando"} ${pid}: ${cmd}`);
  if (!dry) process.kill(Number(pid), "SIGTERM");
}
