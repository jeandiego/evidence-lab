// Helpers compartilhados pelos cenários: API de controle, abertura do lab e disparo dos dois MFEs.
export const WEB = "http://localhost:4180";
// LAB_API_PORT permite medir contra uma API própria sem tocar na instância que alguém esteja usando à mão.
export const API_PORT = process.env.LAB_API_PORT ?? "4191";
export const API = `http://localhost:${API_PORT}`;
export const labUrl = (query) => `${WEB}/?${query}&api=${API_PORT}`;

export const api = (path, body) =>
  fetch(API + path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());

/** Abre o lab e espera os dois MFEs montarem (e o patch, quando a variante tem um). */
export async function openLab(context, query) {
  const page = await context.newPage();
  await page.goto(labUrl(query));
  await page.waitForFunction(
    () => {
      const lab = globalThis.__LAB__;
      // Espera também as queries disparadas na montagem terminarem: o Apollo deduplica queries idênticas em voo,
      // então uma query de montagem ainda pendente "absorveria" a que o cenário dispara em seguida.
      return (
        lab?.mfe?.catalog &&
        lab?.mfe?.cart &&
        (!lab.variant.startsWith("patch") || lab.patchInstalledAt) &&
        lab.results.length >= 2 &&
        lab.results.every((r) => r.outcome !== "pending")
      );
    },
    null,
    { timeout: 10_000 },
  );
  return page;
}

/** Cria uma sessão no servidor e grava no localStorage da página. Aguarda a gravação antes de voltar. */
export async function setSession(page, { expired }) {
  const t = await api("/__lab/session", { expiredAccess: expired });
  await page.evaluate((t) => {
    localStorage.setItem("@shop/auth", JSON.stringify({ token: t.access_token, refreshToken: t.refresh_token }));
    __LAB__.sessionLost = false;
    __LAB__.results.length = 0;
  }, t);
}

/** Dispara a query de cada MFE ao mesmo tempo. Operação sem desfecho em `timeout` ms conta como pending. */
export const fire = (page, timeout = 3000) =>
  page.evaluate(async (timeout) => {
    const run = async ([name, mfe]) => {
      const r = await Promise.race([mfe.refetch(), new Promise((res) => setTimeout(() => res(null), timeout))]);
      return [name, r ? { outcome: r.outcome, detail: r.detail ?? null, ms: Math.round(r.endedAt - r.startedAt) } : { outcome: "pending", detail: null, ms: timeout }];
    };
    return Object.fromEntries(await Promise.all(Object.entries(__LAB__.mfe).map(run)));
  }, timeout);

export const stateOf = (page) =>
  page.evaluate(() => ({ sessionLost: __LAB__.sessionLost, stored: !!localStorage.getItem("@shop/auth") }));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
