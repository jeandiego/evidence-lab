// Cenários S1 a S6 e S8. Cada trial roda num contexto novo do navegador (localStorage limpo).
// O S7 (custo de migração) é estático e fica em migration-cost.mjs.
import { api, fire, labUrl, openLab, setSession, sleep, stateOf } from "./harness.mjs";

const ALL = [
  { id: "baseline", query: "variant=baseline" },
  { id: "patch", query: "variant=patch" },
  { id: "utility", query: "variant=utility" },
];
const pct = (trials, pred) => {
  const k = trials.filter(pred).length;
  return `${Math.round((100 * k) / trials.length)}% (${k}/${trials.length})`; // sempre com a contagem: n é pequeno
};
const mean = (trials, f) => +(trials.reduce((s, t) => s + f(t), 0) / trials.length).toFixed(2);
const okCount = (outcomes) => Object.values(outcomes).filter((o) => o === "ok").length;
const detailsOf = (out) => Object.fromEntries(Object.entries(out).filter(([, v]) => v.detail).map(([k, v]) => [k, v.detail]));
const outcomesOf = (out) => Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.outcome]));

/** Um trial "sessão expirada, os dois MFEs disparam": serve ao S1, S5 (duas abas) e S8. */
async function concurrentTrial({ context }, v) {
  const page = await openLab(context, v.query);
  await api("/__lab/reset", {});
  await setSession(page, { expired: true });
  const out = await fire(page);
  const stats = await api("/__lab/stats");
  const st = await stateOf(page);
  return { outcomes: outcomesOf(out), details: detailsOf(out), refreshCalls: stats.refresh.calls, refreshFailed: stats.refresh.failed, sessionLost: !st.stored || st.sessionLost };
}
const summarizeConcurrent = (t) => ({
  meanRefreshCalls: mean(t, (x) => x.refreshCalls),
  pctTrialsWithFailedRefresh: pct(t, (x) => x.refreshFailed > 0),
  pctBothOk: pct(t, (x) => okCount(x.outcomes) === 2),
  pctSessionLost: pct(t, (x) => x.sessionLost),
});

export const scenarios = {
  S1: {
    title: "Dois MFEs com token expirado ao mesmo tempo",
    n: 15,
    variants: ALL,
    trial: concurrentTrial,
    summarize: summarizeConcurrent,
  },

  S2: {
    title: "Ordem de carga: requests disparadas na montagem, com o patch vindo do root ou de um MFE",
    n: 20,
    variants: [
      { id: "baseline", query: "variant=baseline" },
      { id: "patch (root)", query: "variant=patch&load=root" },
      { id: "patch (parcel)", query: "variant=patch&load=parcel" },
      { id: "utility", query: "variant=utility" },
    ],
    // A mesma seed em todas as variantes: os atrasos de carga são idênticos, o trial i é pareado.
    trial: async ({ browser }, v, i) => {
      await api("/__lab/reset", {});
      const t = await api("/__lab/session", { expiredAccess: true });
      const context = await browser.newContext();
      await context.addInitScript((t) => localStorage.setItem("@shop/auth", JSON.stringify({ token: t.access_token, refreshToken: t.refresh_token })), {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
      });
      const page = await context.newPage();
      await page.goto(labUrl(`${v.query}&seed=${i + 1}`));
      await page
        .waitForFunction(() => __LAB__.results.length >= 2 && __LAB__.results.every((r) => r.outcome !== "pending"), null, { timeout: 5000 })
        .catch(() => {});
      const first = await page.evaluate(() => {
        const seen = {};
        for (const r of __LAB__.results) seen[r.mfe] ??= r.outcome;
        return seen;
      });
      const stats = await api("/__lab/stats");
      await context.close();
      return { seed: i + 1, firstOutcomes: first, unauthorized: stats.unauthorized, refreshCalls: stats.refresh.calls };
    },
    summarize: (t) => ({
      pctBothFirstRequestsOk: pct(t, (x) => okCount(x.firstOutcomes) === 2 && Object.keys(x.firstOutcomes).length === 2),
      meanUnauthorized: mean(t, (x) => x.unauthorized),
      meanRefreshCalls: mean(t, (x) => x.refreshCalls),
    }),
  },

  S5: {
    title: "Duas abas com token expirado ao mesmo tempo",
    n: 10,
    variants: ALL,
    trial: async ({ context }, v) => {
      const a = await openLab(context, v.query);
      const b = await openLab(context, v.query);
      await api("/__lab/reset", {});
      await setSession(a, { expired: true });
      await b.evaluate(() => {
        __LAB__.results.length = 0;
        __LAB__.sessionLost = false;
      });
      const [oa, ob] = await Promise.all([fire(a), fire(b)]);
      const stats = await api("/__lab/stats");
      const st = await stateOf(a);
      return { outcomes: { ...Object.fromEntries(Object.entries(outcomesOf(oa)).map(([k, o]) => ["a." + k, o])), ...Object.fromEntries(Object.entries(outcomesOf(ob)).map(([k, o]) => ["b." + k, o])) }, refreshCalls: stats.refresh.calls, refreshFailed: stats.refresh.failed, sessionLost: !st.stored };
    },
    summarize: (t) => ({
      meanRefreshCalls: mean(t, (x) => x.refreshCalls),
      pctTrialsWithFailedRefresh: pct(t, (x) => x.refreshFailed > 0),
      pctAllFourOk: pct(t, (x) => okCount(x.outcomes) === 4),
      pctSessionLost: pct(t, (x) => x.sessionLost),
    }),
  },

  S6: {
    title: "Token revogado no servidor com exp ainda válido (401)",
    n: 10,
    variants: ALL,
    trial: async ({ context }, v) => {
      const page = await openLab(context, v.query);
      await api("/__lab/reset", {});
      await setSession(page, { expired: false });
      await api("/__lab/revoke", {});
      await sleep(10);
      const out = await fire(page);
      const stats = await api("/__lab/stats");
      return { outcomes: outcomesOf(out), refreshCalls: stats.refresh.calls };
    },
    summarize: (t) => ({ pctBothOk: pct(t, (x) => okCount(x.outcomes) === 2), meanRefreshCalls: mean(t, (x) => x.refreshCalls) }),
  },

  S8: {
    title: "utility com uma cópia empacotada de authFetch no cart (singleton quebrado), com e sem navigator.locks",
    n: 15,
    variants: [
      { id: "utility (import map)", query: "variant=utility&auth=external" },
      { id: "utility (cópia no cart)", query: "variant=utility&auth=bundled" },
      { id: "utility (import map, sem locks)", query: "variant=utility&auth=external", noLocks: true },
      { id: "utility (cópia no cart, sem locks)", query: "variant=utility&auth=bundled", noLocks: true },
    ],
    trial: async (ctx, v) => {
      // Sem navigator.locks o authFetch cai na renovação sem trava: isola o que o lock protege.
      if (v.noLocks) await ctx.context.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined, configurable: true }));
      return concurrentTrial(ctx, v);
    },
    summarize: summarizeConcurrent,
  },
};
