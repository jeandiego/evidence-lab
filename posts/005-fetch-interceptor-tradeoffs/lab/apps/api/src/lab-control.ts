// Endpoints /__lab/*: o harness liga e desliga falhas e lê os contadores. Não existem em produção.
import { issueTokens, resetSessions } from "./auth.ts";
import { resetCarts } from "./data.ts";
import { config, DEFAULT_CONFIG, resetStats, stats } from "./state.ts";

export function handleLab(method: string, path: string, body: Record<string, unknown>): { status: number; body: unknown } | null {
  if (method === "GET" && path === "/__lab/config") return { status: 200, body: config };
  if (method === "GET" && path === "/__lab/stats") return { status: 200, body: stats };

  if (method === "POST" && path === "/__lab/config") {
    for (const key of Object.keys(DEFAULT_CONFIG) as (keyof typeof DEFAULT_CONFIG)[]) {
      if (key in body && typeof body[key] === typeof DEFAULT_CONFIG[key]) (config as Record<string, unknown>)[key] = body[key];
    }
    return { status: 200, body: config };
  }
  // Zera só os contadores: mantém sessões, carrinho e configuração.
  if (method === "POST" && path === "/__lab/stats/reset") {
    resetStats();
    return { status: 200, body: stats };
  }
  if (method === "POST" && path === "/__lab/reset") {
    resetStats();
    resetSessions();
    resetCarts();
    Object.assign(config, DEFAULT_CONFIG);
    return { status: 200, body: config };
  }
  // Revoga os access tokens já emitidos: o exp continua válido, mas o servidor responde 401.
  if (method === "POST" && path === "/__lab/revoke") {
    config.revokedBefore = Date.now();
    return { status: 200, body: { revokedBefore: config.revokedBefore } };
  }
  // Sessão pronta para o harness, sem passar pelo login. `expiredAccess` entrega o access token já vencido.
  if (method === "POST" && path === "/__lab/session") {
    return { status: 200, body: issueTokens("demo", { expiredAccess: body.expiredAccess === true }) };
  }
  return null;
}
