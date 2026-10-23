// Roda variante × cenário × N trials no Chromium e grava dados brutos e agregados em ../evidence.
// Uso: node scripts/benchmark.mjs [--scenarios S1,S3] [--n 5]
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { API, API_PORT, api, sleep, WEB } from "./harness.mjs";
import { migrationCost } from "./migration-cost.mjs";
import { scenarios } from "./scenarios.mjs";

const lab = fileURLToPath(new URL("..", import.meta.url));
const evidenceDir = fileURLToPath(new URL("../../evidence/", import.meta.url));
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const only = process.argv.includes("--scenarios") ? arg("--scenarios").split(",") : null;
const nOverride = process.argv.includes("--n") ? Number(arg("--n")) : null;

const up = (url) => fetch(url).then(() => true, () => false);
const children = [];
async function ensureServers() {
  if (!(await up(API + "/__lab/config"))) children.push(spawn("node", ["src/server.ts"], { cwd: lab + "apps/api", stdio: "ignore", env: { ...process.env, API_PORT } }));
  if (!(await up(WEB))) children.push(spawn("node", ["scripts/serve.mjs"], { cwd: lab, stdio: "ignore" }));
  for (let i = 0; i < 40 && !((await up(API + "/__lab/config")) && (await up(WEB))); i++) await sleep(250);
}

await ensureServers();
const browser = await chromium.launch();
const version = (pkg) => JSON.parse(readFileSync(lab + `node_modules/${pkg}/package.json`, "utf8")).version;

await api("/__lab/reset", {});
const environment = {
  startedAt: new Date().toISOString(),
  node: process.version,
  os: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpus: os.cpus()[0]?.model,
  chromium: browser.version(),
  playwright: version("playwright"),
  apolloClient: version("@apollo/client"),
  singleSpa: version("single-spa"),
  apiPort: API_PORT,
  apiDefaults: await api("/__lab/config"),
};

const raw = {};
const summary = {};
for (const [id, sc] of Object.entries(scenarios)) {
  if (only && !only.includes(id)) continue;
  const n = nOverride ?? sc.n;
  raw[id] = { title: sc.title, n, variants: {} };
  summary[id] = { title: sc.title, n, variants: {} };
  for (const v of sc.variants) {
    const trials = [];
    for (let i = 0; i < n; i++) {
      const context = await browser.newContext();
      try {
        trials.push(await sc.trial({ browser, context }, v, i));
      } catch (e) {
        trials.push({ error: String(e.message).split("\n")[0] });
      } finally {
        await context.close().catch(() => {});
      }
    }
    const valid = trials.filter((t) => !t.error);
    raw[id].variants[v.id] = trials;
    summary[id].variants[v.id] = { trialsRun: trials.length, trialErrors: trials.length - valid.length, ...(valid.length ? sc.summarize(valid) : {}) };
    console.log(id, v.id.padEnd(26), JSON.stringify(summary[id].variants[v.id]));
  }
}

const cost = migrationCost();
environment.finishedAt = new Date().toISOString();
mkdirSync(evidenceDir, { recursive: true });
const write = (name, data) => writeFileSync(evidenceDir + name, JSON.stringify(data, null, 2) + "\n");
if (process.argv.includes("--merge")) {
  // Reexecuta só alguns cenários e troca as entradas deles nos arquivos já gravados.
  const read = (name) => JSON.parse(readFileSync(evidenceDir + name, "utf8"));
  write("benchmark.json", { ...read("benchmark.json"), ...raw });
  write("summary.json", { ...read("summary.json"), ...summary });
  write("migration-cost.json", cost);
  write("environment.json", { ...read("environment.json"), mergedAt: environment.finishedAt, mergedScenarios: Object.keys(raw) });
} else if (!only && !nOverride) {
  write("environment.json", environment);
  write("benchmark.json", raw);
  write("summary.json", summary);
  write("migration-cost.json", cost);
} else {
  console.log("execução parcial: evidence/ não foi sobrescrito");
}
await browser.close();
children.forEach((c) => c.kill());
