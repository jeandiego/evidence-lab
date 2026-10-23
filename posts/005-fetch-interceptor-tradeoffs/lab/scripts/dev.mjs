// Sobe a API (4191) e o servidor estático (4180). Rode `npm run build` antes.
import { spawn } from "node:child_process";

const run = (cmd, args, env = {}) => spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
const children = [run("npm", ["run", "start", "--workspace", "@shop-lab/api"]), run("node", ["scripts/serve.mjs"])];
for (const c of children) c.on("exit", () => children.forEach((k) => k.kill()));
