// Grava a demo real do lab 005 (baseline e patch) como frames do screencast do Chromium, mais o log do que aconteceu:
// cliques, requests GraphQL com status e corpo, resultados dos MFEs e contadores da API. O vídeo só usa o que está aqui.
// Pré-requisito: o lab no ar (npm run up em ../lab). Uso: node record.mjs
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "../lab/node_modules/playwright/index.mjs";

const WEB = "http://localhost:4180";
const API = "http://localhost:4191";
const OUT = new URL("./footage/", import.meta.url).pathname;
const VIEW = { width: 1280, height: 960 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (path, body) => fetch(API + path, body ? { method: "POST", body: JSON.stringify(body) } : {}).then((r) => r.json());

const TAKES = [
  { id: "baseline", query: "variant=baseline" },
  { id: "patch", query: "variant=patch&load=root" },
];

// Caixas dos elementos que o vídeo enquadra, em px CSS do viewport.
const TARGETS = {
  catalog: "#mfe-catalog",
  cart: "#mfe-cart",
  inspector: ".inspector",
  dock: ".inspector__dock",
  strategy: ".dock__strategy",
  health: ".health-grid",
  session: ".health-grid > div:nth-child(1)",
  refresh: ".health-grid > div:nth-child(2)",
  failures: ".health-grid > div:nth-child(3)",
  unauthorized: ".health-grid > div:nth-child(4)",
  dockAlert: ".dock__alert",
  catalogAlert: "#mfe-catalog .commerce-alert",
  cartAlert: "#mfe-cart .commerce-alert",
  catalogStatus: "#mfe-catalog .mfe-status",
  cartStatus: "#mfe-cart .mfe-status",
  back: ".product-detail__back",
  grid: ".product-grid",
  firstCard: ".product-card",
  detail: ".product-detail",
  expireBtn: ".dock__btn >> nth=0",
};

async function snapshot(page) {
  const out = {};
  for (const [k, sel] of Object.entries(TARGETS)) {
    const box = await page.locator(sel).first().boundingBox({ timeout: 50 }).catch(() => null);
    if (box) out[k] = box;
  }
  out.text = await page.evaluate(() => ({
    strategy: document.querySelector(".dock__strategy strong")?.textContent,
    health: [...document.querySelectorAll(".health-grid > div")].map((d) => [d.querySelector("span")?.textContent, d.querySelector("strong")?.textContent]),
    dockAlert: document.querySelector(".dock__alert")?.textContent ?? null,
    catalogStatus: document.querySelector("#mfe-catalog .mfe-status strong")?.textContent ?? null,
    cartStatus: document.querySelector("#mfe-cart .mfe-status strong")?.textContent ?? null,
    alerts: [...document.querySelectorAll(".commerce-alert strong")].map((e) => e.textContent),
  }));
  return out;
}

async function record(browser, take) {
  const dir = `${OUT}${take.id}/`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(`${dir}frames`, { recursive: true });

  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const log = { take: take.id, view: VIEW, scale: 2, frames: [], marks: [], network: [], snapshots: {} };
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const mark = (name, extra = {}) => log.marks.push({ t: now(), name, ...extra });

  // Rede: só o que vai para a API GraphQL, com a operação e o desfecho.
  const pending = new Map();
  page.on("request", (req) => {
    if (!req.url().includes(":4191/graphql") || req.method() !== "POST") return;
    const body = req.postData() ?? "";
    const op = body.match(/"operationName":"(\w+)"/)?.[1] ?? body.match(/(mutation|query)\s+(\w+)/)?.[2] ?? "?";
    const entry = { op, start: now(), auth: (req.headers().authorization ?? "").slice(0, 24) || null };
    pending.set(req, entry);
    log.network.push(entry);
  });
  page.on("response", async (res) => {
    const entry = pending.get(res.request());
    if (!entry) return;
    entry.end = now();
    entry.status = res.status();
    entry.body = (await res.text().catch(() => "")).slice(0, 240);
  });

  // Screencast: um JPEG a cada mudança de tela, com o carimbo de tempo do próprio Chromium.
  const cdp = await context.newCDPSession(page);
  let n = 0;
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `frames/${String(n++).padStart(5, "0")}.jpg`;
    log.frames.push({ t: Math.round(metadata.timestamp * 1000 - t0), file });
    await writeFile(dir + file, Buffer.from(data, "base64"));
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });

  await page.goto(`${WEB}/?${take.query}`);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: VIEW.width * 2, maxHeight: VIEW.height * 2 });
  await page.waitForSelector(".inspector__dock");
  await sleep(800);

  const click = async (name, locator) => {
    const box = await locator.boundingBox();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y, { steps: 12 });
    await sleep(180);
    mark(name, { at, box });
    await page.mouse.click(at.x, at.y);
  };
  const settled = () =>
    page.waitForFunction(() => __LAB__.results.length > 0 && __LAB__.results.every((r) => r.outcome !== "pending"), null, { timeout: 8000 });

  // 1. Ponto de partida: sessão válida, os dois MFEs carregados.
  await click("reset", page.getByRole("button", { name: "Resetar cenário" }));
  await page.waitForSelector(".dock__btn:has-text('Resetar cenário'):not([disabled])");
  await page.waitForSelector(".product-card");
  await sleep(700); // curto: o token do lab vive 5 s e o carrinho precisa ser preenchido antes de ele vencer
  log.snapshots.home = await snapshot(page);

  // 2. O usuário abre um produto: o carrinho lateral desmonta.
  await click("openProduct", page.locator(".product-card__link").first());
  await page.waitForSelector(".product-detail__add");
  await sleep(500);
  // Põe o produto no carrinho com o token ainda válido: ao voltar, o carrinho tem o que mostrar (ou o que perder).
  await click("addToCart", page.locator(".product-detail__add"));
  await page.waitForSelector(".product-detail__add:has-text('Adicionado')");
  await sleep(1100);

  // 3. O token vence (o atalho do painel; esperar 5 s dá no mesmo).
  await click("expireToken", page.getByRole("button", { name: "Vencer token" }));
  await sleep(1300);
  log.snapshots.expired = await snapshot(page);

  // 4. Voltar: o catálogo recarrega a lista e o carrinho monta de novo, os dois consultam a API no mesmo instante.
  await page.evaluate(() => (__LAB__.results.length = 0));
  await click("back", page.locator(".product-detail__back"));
  await settled();
  mark("settled");
  await sleep(1600); // o painel lê /__lab/stats a cada 500 ms
  log.snapshots.after = await snapshot(page);
  log.results = await page.evaluate(() => __LAB__.results.map((r) => ({ ...r })));
  log.sessionLost = await page.evaluate(() => __LAB__.sessionLost);
  log.stats = await api("/__lab/stats");
  mark("end");

  await cdp.send("Page.stopScreencast");
  await sleep(200);
  await context.close();
  await writeFile(`${dir}log.json`, JSON.stringify(log, null, 2));
  const back = log.marks.find((m) => m.name === "back").t;
  const refreshes = log.network.filter((r) => r.op === "refreshToken");
  if (refreshes.some((r) => r.start < back)) console.warn(`${take.id}: refresh antes do Voltar, grave de novo`);
  console.log(
    `${take.id}: ${log.frames.length} frames · refresh ${log.stats.refresh.calls} (falhas ${log.stats.refresh.failed}) · 401 ${log.stats.unauthorized} · sessão perdida ${log.sessionLost} ·`,
    refreshes.map((r) => r.status).join(","),
  );
}

const browser = await chromium.launch();
for (const take of TAKES) {
  await api("/__lab/reset", {});
  await record(browser, take);
}
await browser.close();
