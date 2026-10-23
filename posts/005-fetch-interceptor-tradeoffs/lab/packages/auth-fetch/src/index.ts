// fetch com autenticação: renova antes de expirar, uma vez só, e tenta de novo uma vez após 401.
// Serve aos dois usos do lab: instalado como window.fetch (patch) ou importado por MFE (utility).
export type AuthFetchOptions = {
  bffUrl: string;
  storageKey?: string;
  /** fetch usado para tudo: quem instala o patch passa o fetch original, para não recursar. */
  baseFetch?: typeof fetch;
  /** margem para o desvio de relógio entre cliente e servidor */
  leewaySec?: number;
  /** chamado quando a sessão não pode ser renovada (a aplicação decide o que fazer: redirecionar, avisar) */
  onExpired?: () => void;
};

export class AuthExpiredError extends Error {
  constructor(cause?: unknown) {
    super("session expired", { cause });
    this.name = "AuthExpiredError";
  }
}

type Stored = { token: string; refreshToken: string };

const expMs = (jwt?: string) => {
  try {
    return JSON.parse(atob((jwt ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000 as number;
  } catch {
    return 0;
  }
};

const abortable = <T>(p: Promise<T>, signal?: AbortSignal | null) =>
  !signal
    ? p
    : Promise.race([
        p,
        new Promise<never>((_, reject) => {
          if (signal.aborted) reject(signal.reason);
          else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
      ]);

export function createAuthFetch(opts: AuthFetchOptions): typeof fetch {
  const { bffUrl, storageKey = "@shop/auth", leewaySec = 1 } = opts;
  const base: typeof fetch = opts.baseFetch ?? ((...args) => globalThis.fetch(...args));
  const endpoint = new URL(bffUrl, globalThis.location?.href);

  const read = () => JSON.parse(localStorage.getItem(storageKey) ?? "null") as Stored | null;
  const expired = (jwt?: string) => Date.now() >= expMs(jwt) - leewaySec * 1000;
  const isTarget = (input: RequestInfo | URL) => {
    const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, globalThis.location?.href);
    return u.origin === endpoint.origin && u.pathname === endpoint.pathname;
  };

  const withToken = (input: RequestInfo | URL, init: RequestInit | undefined, token: string): [RequestInfo | URL, RequestInit] => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${token}`);
    return [input, { ...init, headers }]; // o signal de quem chamou segue intacto
  };

  const callRefresh = async () => {
    const cur = read();
    const res = await base(bffUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "mutation refreshToken($token: String!) { refreshToken(token: $token) { access_token refresh_token } }",
        variables: { token: cur?.refreshToken },
      }),
    });
    const tokens = (await res.json())?.data?.refreshToken;
    if (!res.ok || !tokens) throw new Error(`refresh failed (${res.status})`);
    localStorage.setItem(storageKey, JSON.stringify({ token: tokens.access_token, refreshToken: tokens.refresh_token }));
  };

  // Uma renovação por vez nesta aba (inflight) e uma por origem (navigator.locks). Dentro do lock relê o
  // storage: se outra aba já renovou enquanto esperávamos, não renova de novo.
  let inflight: Promise<void> | undefined;
  const refresh = (staleToken?: string) =>
    (inflight ??= (async () => {
      try {
        const run = async () => {
          const cur = read();
          const stillStale = staleToken ? cur?.token === staleToken : expired(cur?.token);
          if (!stillStale) return;
          if (!cur?.refreshToken || expired(cur.refreshToken)) throw new Error("refresh token expired");
          await callRefresh();
        };
        await (globalThis.navigator?.locks ? navigator.locks.request("auth-refresh", run) : run());
      } catch (cause) {
        localStorage.removeItem(storageKey);
        opts.onExpired?.();
        throw new AuthExpiredError(cause);
      } finally {
        inflight = undefined;
      }
    })());

  return async (input, init) => {
    if (!isTarget(input) || /\bmutation\s+refreshToken\b/.test(typeof init?.body === "string" ? init.body : "")) return base(input, init);
    let stored = read();
    if (!stored?.token) return base(input, init); // sem sessão: o servidor decide
    if (expired(stored.token)) {
      await abortable(refresh(), init?.signal);
      stored = read();
      if (!stored?.token) throw new AuthExpiredError();
    }
    const sent = stored.token;
    const res = await base(...withToken(input, init, sent));
    if (res.status !== 401) return res;
    // Token revogado ou com relógio desalinhado: renova uma vez e repete a request.
    await abortable(refresh(sent), init?.signal);
    const retried = read();
    if (!retried?.token) throw new AuthExpiredError();
    return base(...withToken(input, init, retried.token));
  };
}

// Singleton para o uso como utility module. A configuração vem de globalThis.__LAB__ (definida pelo shell).
let instance: typeof fetch | undefined;
export const authFetch: typeof fetch = (input, init) => {
  const cfg = (globalThis as { __LAB__?: AuthFetchOptions }).__LAB__;
  if (!cfg) throw new Error("globalThis.__LAB__ não definido");
  return (instance ??= createAuthFetch(cfg))(input, init);
};
