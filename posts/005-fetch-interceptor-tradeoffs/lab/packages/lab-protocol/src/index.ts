// Contrato entre shell, MFEs e benchmark: o objeto global __LAB__ e o registro de resultados.
export type VariantName = "baseline" | "patch" | "utility";

export type OperationResult = {
  mfe: string;
  op: string;
  startedAt: number; // performance.now()
  endedAt?: number;
  outcome: "pending" | "ok" | "error" | "aborted";
  detail?: string;
};

export type Mfe = { refetch(opts?: { signal?: AbortSignal }): Promise<OperationResult> };

export type LabGlobals = {
  variant: VariantName;
  load: "root" | "parcel"; // de onde vem o patch
  auth: "external" | "bundled"; // authFetch do import map ou cópia empacotada no cart (utility)
  seed: number; // atrasos de carga determinísticos
  mfeDelay: number; // atraso máximo (ms) para carregar cada MFE; 0 = montam juntos, como bundles em paralelo
  bffUrl: string;
  storageKey: string;
  results: OperationResult[];
  mfe: Record<string, Mfe>;
  sessionLost: boolean;
  patchInstalledAt?: number;
  onExpired: () => void; // também é lido por authFetch como AuthFetchOptions
};

export const lab = () => (globalThis as { __LAB__?: LabGlobals }).__LAB__!;

/** Executa uma operação do MFE e registra o desfecho em __LAB__.results. */
export async function track(mfe: string, op: string, run: () => Promise<unknown>): Promise<OperationResult> {
  const result: OperationResult = { mfe, op, startedAt: performance.now(), outcome: "pending" };
  lab().results.push(result);
  try {
    await run();
    result.outcome = "ok";
  } catch (e) {
    const err = e as Error;
    const aborted = err?.name === "AbortError" || (err as { networkError?: Error })?.networkError?.name === "AbortError";
    result.outcome = aborted ? "aborted" : "error";
    result.detail = `${err?.name}: ${err?.message}`.slice(0, 120);
  }
  result.endedAt = performance.now();
  return result;
}

/**
 * refetchOnWindowFocus: roda `run` quando o usuário volta para a página. Escuta visibilitychange (troca de aba) e
 * focus (troca de janela): cada navegador dispara um, outro ou os dois, quase juntos, então os dois sinais são
 * fundidos numa janela de 500 ms. Cada MFE chama isto por conta própria, como acontece numa aplicação real.
 */
export function onReturnToTab(run: () => void): () => void {
  let last = -Infinity;
  const handler = () => {
    if (document.visibilityState !== "visible" || performance.now() - last < 500) return;
    last = performance.now();
    run();
  };
  document.addEventListener("visibilitychange", handler);
  window.addEventListener("focus", handler);
  return () => {
    document.removeEventListener("visibilitychange", handler);
    window.removeEventListener("focus", handler);
  };
}
