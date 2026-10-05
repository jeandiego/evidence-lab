import { spawn, spawnSync } from "node:child_process"

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run("docker", ["compose", "up", "-d", "db"])
run("npm", ["run", "db:wait"])
run("npm", ["run", "db:migrate"])
run("npm", ["run", "db:seed"])

const child = spawn(
  "npx",
  ["concurrently", "--kill-others", "--names", "api,web", "--prefix-colors", "magenta,cyan", "npm:dev:api", "npm:dev:web"],
  { stdio: "inherit", shell: false },
)

child.on("exit", (code) => process.exit(code ?? 0))
process.on("SIGINT", () => child.kill("SIGINT"))
