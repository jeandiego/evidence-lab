// Benchmark em escala: milhares de usuários simulados, cada um com M MFEs que consultam a API ao mesmo tempo
// depois de o token expirar (voltar à aba, voltar de uma página, recarregar). Roda o código REAL dos clients
// Apollo dos MFEs e dos pacotes de auth contra a API real; só o navegador é simulado (ver env.mjs).
// Uso: node scripts/scale/scale.mjs [--users 1000] [--budget 180] [--quick]
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { als, makeLocks, realFetch } from "./env.mjs"; // precisa vir antes de qualquer código que leia os globais
import { ApolloClient, gql, HttpLink, InMemoryCache } from "@apollo/client/core";
import { createAuthFetch } from "../../packages/auth-fetch/src/index.ts";

const lab = fileURLToPath(new URL("../..", import.meta.url));
const evidenceDir = fileURLToPath(new URL("../../../evidence/", import.meta.url));
const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const USERS = Number(arg("--users", 1000));
const BUDGET = Number(arg("--budget", 180)); // requests simultâneas aproximadas em voo (limite de sockets)
const QUICK = process.argv.includes("--quick");
const ONLY = arg("--only", null); // ex.: --only E reexecuta só esse cenário e o mescla em scale-benchmark.json
const PORT = 4193;
const API = `http://localhost:${PORT}`;
const GQL = `${API}/graphql`;

const VARIANTS = ["baseline", "patch", "utility"];
const MFES = QUICK ? [2, 10] : [2, 5, 10, 20];
const WINDOWS = QUICK ? [0, 200] : [0, 50, 200]; // ms entre a primeira e a última request dos MFEs

const clientFile = (name) => pathToFileURL(lab + `apps/catalog/src/apollo/${name}`).href;
const baselineClient = await import(clientFile("client.baseline.ts"));
const plainClient = await import(clientFile("client.plain.ts"));
const QUERY = gql`query products { products { id } }`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const api = (path, body) => realFetch(API + path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());

/** Um usuário que volta à loja com o token vencido: M MFEs consultam a API com offsets aleatórios em [0, W]. */
async function runUser({ variant, mfes, windowMs, id }) {
  const key = `@shop/auth:${id}`;
  const counters = { refreshCalls: 0, refreshFailed: 0 };
  const store = new Map();
  const localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  // Fetch "real" do usuário, com contagem dos refreshes que ele mesmo dispara.
  const countingFetch = async (input, init) => {
    const isRefresh = typeof init?.body === "string" && init.body.includes("mutation refreshToken");
    const res = await realFetch(input, init);
    if (isRefresh) {
      counters.refreshCalls++;
      if (!res.ok) counters.refreshFailed++;
    }
    return res;
  };
  const win = { fetch: countingFetch, location: { pathname: "/", search: "", href: "http://localhost/" } };
  const labGlobals = { variant, load: "root", auth: "external", seed: 1, mfeDelay: 0, bffUrl: GQL, storageKey: key, results: [], mfe: {}, sessionLost: false, onExpired: () => (labGlobals.sessionLost = true) };

  return als.run({ lab: labGlobals, localStorage, window: win, navigator: { locks: makeLocks() } }, async () => {
    const tokens = await api("/__lab/session", { expiredAccess: true });
    localStorage.setItem(key, JSON.stringify({ token: tokens.access_token, refreshToken: tokens.refresh_token }));

    if (variant === "patch") win.fetch = createAuthFetch({ bffUrl: GQL, storageKey: key, baseFetch: win.fetch.bind(win), onExpired: labGlobals.onExpired });
    // utility: uma instância de authFetch por página, compartilhada pelos MFEs (o que o import map garante)
    const sharedAuthFetch = variant === "utility" ? createAuthFetch({ bffUrl: GQL, storageKey: key, onExpired: labGlobals.onExpired }) : null;

    const random = rng(id * 2654435761);
    const clients = Array.from({ length: mfes }, () =>
      variant === "baseline" ? baselineClient.createClient()
      : variant === "utility" ? new ApolloClient({ link: new HttpLink({ uri: GQL, fetch: sharedAuthFetch }), cache: new InMemoryCache() })
      : plainClient.createClient(),
    );
    const outcomes = await Promise.all(
      clients.map(async (client) => {
        await sleep(random() * windowMs);
        return Promise.race([
          client.query({ query: QUERY, fetchPolicy: "network-only" }).then(() => "ok", () => "error"),
          sleep(4000).then(() => "pending"),
        ]);
      }),
    );
    return { outcomes, ...counters, loggedOut: localStorage.getItem(key) === null };
  });
}

async function pool(total, limit, task) {
  let next = 0;
  const results = [];
  await Promise.all(Array.from({ length: limit }, async () => { while (next < total) { const i = next++; results[i] = await task(i); } }));
  return results;
}

const wilson = (k, n, z = 1.96) => {
  const p = k / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [+(100 * (c - h)).toFixed(1), +(100 * (c + h)).toFixed(1)];
};
const share = (k, n) => ({ k, n, pct: +((100 * k) / n).toFixed(1), ci95: wilson(k, n) });

// ---- API própria, para não interferir em quem estiver usando o lab à mão
const server = spawn("node", ["src/server.ts"], { cwd: lab + "apps/api", stdio: "ignore", env: { ...process.env, API_PORT: String(PORT) } });
for (let i = 0; i < 40; i++) { if (await api("/__lab/config").then(() => true, () => false)) break; await sleep(250); }

// A: o token venceu e os MFEs colidem (varia nº de MFEs e janela de colisão); refresh saudável, rotação estrita.
// B: o mesmo, com o endpoint de refresh degradado (uma fração dos refreshes falha).
// C: o servidor tolera o reuso do refresh token por N segundos (rotation overlap, como o Auth0).
// D: sensibilidade à latência do refresh (quanto mais lento, maior a janela de colisão).
const plan = [];
const base = { windowMs: 50, failRate: 0, leeway: 0, latency: 150, rotation: true };
for (const mfes of MFES) for (const windowMs of WINDOWS) for (const variant of VARIANTS) plan.push({ ...base, scenario: "A", variant, mfes, windowMs });
for (const failRate of QUICK ? [0.2] : [0.05, 0.2]) for (const mfes of QUICK ? [2] : [2, 10]) for (const variant of VARIANTS) plan.push({ ...base, scenario: "B", variant, mfes, failRate });
for (const leeway of QUICK ? [1] : [0.1, 0.5, 5]) for (const mfes of QUICK ? [2] : [2, 10]) for (const variant of VARIANTS) plan.push({ ...base, scenario: "C", variant, mfes, windowMs: 200, leeway });
for (const latency of QUICK ? [500] : [50, 150, 500, 1000]) for (const mfes of QUICK ? [2] : [2, 10]) for (const variant of VARIANTS) plan.push({ ...base, scenario: "D", variant, mfes, windowMs: 200, latency });
// E: o servidor não rotaciona o refresh token (cada refresh é aceito, sem falha por reuso).
for (const mfes of QUICK ? [2] : [2, 5, 10, 20]) for (const variant of VARIANTS) plan.push({ ...base, scenario: "E", variant, mfes, rotation: false });
const selected = ONLY ? plan.filter((cell) => ONLY.split(",").includes(cell.scenario)) : plan;

const cells = [];
const t0 = Date.now();
let userSeq = 1;
for (const { scenario, variant, mfes, windowMs, failRate, leeway, latency, rotation } of selected) {
  await api("/__lab/reset", {});
  await api("/__lab/config", { refreshFailRate: failRate, rotationLeewaySec: leeway, refreshLatencyMs: latency, rotation });
  const started = Date.now();
  const limit = Math.max(4, Math.floor(BUDGET / mfes));
  const first = userSeq; userSeq += USERS;
  const users = await pool(USERS, limit, (i) => runUser({ variant, mfes, windowMs, id: first + i }));
  const stats = await api("/__lab/stats");
  const n = users.length;
  const count = (pred) => users.filter(pred).length;
  const histogram = {};
  for (const u of users) histogram[u.refreshCalls] = (histogram[u.refreshCalls] ?? 0) + 1;
  const cell = {
    scenario, variant, mfes, windowMs, refreshFailRate: failRate, rotationLeewaySec: leeway, refreshLatencyMs: latency, rotation, users: n,
    allRequestsOk: share(count((u) => u.outcomes.every((o) => o === "ok")), n),
    loggedOut: share(count((u) => u.loggedOut), n),
    withFailedRefresh: share(count((u) => u.refreshFailed > 0), n),
    withPendingRequest: share(count((u) => u.outcomes.includes("pending")), n),
    meanRefreshCallsPerUser: +(users.reduce((s, u) => s + u.refreshCalls, 0) / n).toFixed(2),
    refreshCallsHistogram: histogram,
    meanFailedRequestsPerUser: +(users.reduce((s, u) => s + u.outcomes.filter((o) => o !== "ok").length, 0) / n).toFixed(2),
    server: { refreshCalls: stats.refresh.calls, refreshFailed: stats.refresh.failed, refreshReused: stats.refresh.reused, refreshOverlapped: stats.refresh.overlapped, refreshErrorRate: stats.refresh.calls ? +((100 * stats.refresh.failed) / stats.refresh.calls).toFixed(1) : 0, unauthorized: stats.unauthorized },
    seconds: +((Date.now() - started) / 1000).toFixed(1),
  };
  cells.push(cell);
  console.log(`${scenario} rot=${rotation} fail=${failRate} leeway=${leeway} L=${latency} M=${String(mfes).padStart(2)} W=${String(windowMs).padStart(3)} ${variant.padEnd(14)} logout ${String(cell.loggedOut.pct).padStart(5)}%  todas ok ${String(cell.allRequestsOk.pct).padStart(5)}%  refresh/usuário ${cell.meanRefreshCallsPerUser}  erro de refresh no servidor ${cell.server.refreshErrorRate}%  (${cell.seconds}s)`);
}
server.kill();

const out = {
  method: "Usuários simulados no Node: cada um tem localStorage, window e __LAB__ próprios (AsyncLocalStorage) e M clients Apollo dos MFEs (código real de apps/catalog/src/apollo e dos pacotes de auth). O token já está vencido e as M requests saem com offsets aleatórios em [0, windowMs]. A API é a real (rotação de refresh token ligada, refresh com 150 ms de latência).",
  limits: [
    "Não há navegador, single-spa nem React: o que escala é a lógica de auth, não a renderização.",
    "Não modela várias abas (navigator.locks não existe no Node): o auth-fetch usa só o dedupe dentro da aba.",
    "Parâmetros são do lab (latência do refresh, número de MFEs, janela de colisão). Os números não são calibrados com a produção.",
    "A variante patch é instalada no root (sem o atraso do patch carregado como MFE).",
  ],
  environment: { node: process.version, os: `${os.platform()} ${os.release()} ${os.arch()}`, cpus: os.cpus()[0]?.model, apollo: JSON.parse(readFileSync(lab + "node_modules/@apollo/client/package.json", "utf8")).version, usersPerCell: USERS, inflightBudget: BUDGET, startedAt: new Date(t0).toISOString(), minutes: +((Date.now() - t0) / 60000).toFixed(1) },
  cells,
};
if (ONLY) {
  const file = evidenceDir + "scale-benchmark.json";
  const previous = JSON.parse(readFileSync(file, "utf8"));
  const kept = previous.cells.filter((cell) => !ONLY.split(",").includes(cell.scenario));
  writeFileSync(file, JSON.stringify({ ...previous, cells: [...kept, ...cells], mergedScenarios: ONLY.split(",") }, null, 2) + "\n");
} else if (!QUICK) { mkdirSync(evidenceDir, { recursive: true }); writeFileSync(evidenceDir + "scale-benchmark.json", JSON.stringify(out, null, 2) + "\n"); }
else console.log("execução --quick: evidence/ não foi sobrescrito");
