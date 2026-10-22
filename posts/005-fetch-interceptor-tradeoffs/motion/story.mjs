// A linha do tempo do vídeo (15 s) amarrada aos logs reais de footage/*/log.json. Imagem e som leem daqui:
// tempos de clique, de request e de resposta vêm da gravação; o vídeo só decide câmera, ritmo e câmera lenta.
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const log = { baseline: read("./footage/baseline/log.json"), patch: read("./footage/patch/log.json") };
const S1 = read("../evidence/summary.json").S1.variants;

export const FPS = 60;
export const DURATION = 15;
export const SIZE = { width: 1080, height: 1350 };

const mark = (take, name) => log[take].marks.find((m) => m.name === name);
const back = { baseline: mark("baseline", "back").t, patch: mark("patch", "back").t };

// Janelas em câmera lenta: os primeiros SLOW_MS depois do clique em "Voltar".
const SLOW_MS = 240;
export const SLOW = {
  baseline: { from: 3.45, to: 5.15 },
  patch: { from: 7.4, to: 9.9 },
};
for (const [k, w] of Object.entries(SLOW)) w.factor = Math.round(((w.to - w.from) * 1000) / SLOW_MS);

// Tempo do vídeo (s) -> tempo da gravação (ms), linear por trechos.
const srcMap = {
  baseline: [
    [0, mark("baseline", "openProduct").t - 600],
    [1.25, mark("baseline", "openProduct").t],
    [1.9, mark("baseline", "addToCart").t + 520],
    [2.5, mark("baseline", "expireToken").t],
    [3.0, mark("baseline", "expireToken").t + 560],
    [3.45 - 0.45, back.baseline - 480],
    [SLOW.baseline.from, back.baseline],
    [SLOW.baseline.to, back.baseline + SLOW_MS],
    [6.0, back.baseline + 1500],
  ],
  patch: [
    [6.0, back.patch - 820],
    [SLOW.patch.from, back.patch],
    [SLOW.patch.to, back.patch + SLOW_MS],
    [11.0, back.patch + 1300],
    [15.0, back.patch + 2100],
  ],
};
const interp = (pairs, x, a = 0, b = 1) => {
  if (x <= pairs[0][a]) return pairs[0][b];
  for (let i = 1; i < pairs.length; i++) {
    const [p, q] = [pairs[i - 1], pairs[i]];
    if (x <= q[a]) return p[b] + ((x - p[a]) / (q[a] - p[a])) * (q[b] - p[b]);
  }
  return pairs.at(-1)[b];
};
const videoAt = (take, ms) => interp(srcMap[take], ms, 1, 0);
// Dentro da câmera lenta: ms reais depois do clique -> segundos do vídeo.
const slow = (take, ms) => SLOW[take].from + (ms / SLOW_MS) * (SLOW[take].to - SLOW[take].from);

// Cliques reais, no tempo do vídeo e na coordenada do viewport gravado.
const clicks = [
  ["baseline", "openProduct"],
  ["baseline", "addToCart"],
  ["baseline", "expireToken"],
  ["baseline", "back"],
  ["patch", "back"],
].map(([take, name]) => ({ take, name, t: +videoAt(take, mark(take, name).t).toFixed(3), at: mark(take, name).at }));

// Rede depois do "Voltar", em ms relativos ao clique e já convertida para o tempo do vídeo.
const net = (take) =>
  log[take].network
    .filter((r) => r.start >= back[take])
    .map((r) => {
      const rel = { start: r.start - back[take], end: r.end - back[take] };
      return { op: r.op, status: r.status, code: r.body.match(/"code":"(\w+)"/)?.[1] ?? null, ...rel, vStart: slow(take, rel.start), vEnd: slow(take, rel.end) };
    });

const counts = (take) => Object.fromEntries(log[take].snapshots.after.text.health.map(([k, v]) => [k, v]));

export const story = {
  fps: FPS,
  duration: DURATION,
  size: SIZE,
  slow: SLOW,
  slowMs: SLOW_MS,
  srcMap,
  clicks,
  takes: Object.fromEntries(
    Object.entries(log).map(([take, l]) => [
      take,
      {
        frames: l.frames,
        snapshots: Object.fromEntries(Object.entries(l.snapshots).map(([k, v]) => [k, v])),
        net: net(take),
        results: l.results.map((r) => ({ mfe: r.mfe, outcome: r.outcome, detail: r.detail })),
        counts: counts(take),
        sessionLost: l.sessionLost,
        url: `localhost:4180/?${take === "patch" ? "variant=patch&load=root" : "variant=baseline"}`,
      },
    ]),
  ),
  evidence: {
    n: S1.baseline.trialsRun,
    baseline: { refresh: S1.baseline.meanRefreshCalls, failed: S1.baseline.pctTrialsWithFailedRefresh, lost: S1.baseline.pctSessionLost },
    patch: { refresh: S1.patch.meanRefreshCalls, failed: S1.patch.pctTrialsWithFailedRefresh, ok: S1.patch.pctBothOk },
  },
};

// Autoverificação: o que o vídeo afirma tem de estar na gravação.
const b = story.takes.baseline, p = story.takes.patch;
const refreshes = (t) => t.net.filter((r) => r.op === "refreshToken");
console.assert(refreshes(b).length === 2 && refreshes(b).some((r) => r.code === "REFRESH_REUSED"), "baseline: 2 refreshes, 1 REUSED");
console.assert(b.sessionLost && b.counts.Refresh === "2" && b.counts.Falhas === "1", "baseline: painel 2/1, sessão perdida");
console.assert(refreshes(p).length === 1 && !p.sessionLost && p.counts.Refresh === "1" && p.counts.Falhas === "0", "patch: 1 refresh, sessão mantida");
console.assert(p.results.every((r) => r.outcome === "ok"), "patch: os dois MFEs ok");
