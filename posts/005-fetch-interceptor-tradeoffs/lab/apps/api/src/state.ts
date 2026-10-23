// Estado em memória do lab: configuração controlável, contadores e um log curto de eventos.
export const DEFAULT_CONFIG = {
  accessTtlSec: 5,
  refreshTtlSec: 600,
  rotation: true, // refresh token usado uma vez; reuso falha
  rotationLeewaySec: 0, // tolerância de rotação (como o "rotation overlap" do Auth0): reuso até N s após o 1º uso é aceito
  failRefresh: false, // simula o endpoint de refresh fora do ar
  refreshFailRate: 0, // fração dos refreshes que falham (endpoint degradado), de 0 a 1
  latencyMs: 40,
  refreshLatencyMs: 150, // dá tempo para requests concorrentes se sobreporem
  revokedBefore: 0, // access tokens emitidos até esse instante (epoch ms) são recusados mesmo com exp válido
};

export type Config = typeof DEFAULT_CONFIG;
export const config: Config = { ...DEFAULT_CONFIG };

const emptyStats = () => ({
  refresh: { calls: 0, ok: 0, failed: 0, reused: 0, overlapped: 0 },
  operations: {} as Record<string, number>,
  unauthorized: 0,
  events: [] as { t: number; kind: string; op: string; status: number; note?: string }[],
});

export const stats = emptyStats();

export function resetStats() {
  Object.assign(stats, emptyStats());
}

export function record(kind: string, op: string, status: number, note?: string) {
  stats.events.push({ t: Date.now(), kind, op, status, note });
  if (stats.events.length > 500) stats.events.shift();
}
