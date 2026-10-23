import { Badge, Button } from "@shop-lab/ui";
import { lab } from "@shop-lab/lab-protocol";
import { useEffect, useState } from "react";
import { EventLog } from "./EventLog";

const API = lab().bffUrl.replace("/graphql", "");
// Cada estratégia é uma combinação de ?variant= e ?load=: o rótulo precisa descrever o que o código realmente faz.
const VARIANTS = [
  { id: "baseline", href: "?variant=baseline", label: "Refresh em cada MFE", description: "Cada aplicação renova o próprio token" },
  { id: "patch", href: "?variant=patch&load=root", label: "Patch no shell", description: "Interceptor instalado antes dos MFEs" },
  { id: "utility", href: "?variant=utility", label: "Fetch compartilhado", description: "authFetch explícito em cada HttpLink" },
] as const;
type Stats = { refresh: { calls: number; ok: number; failed: number; reused: number }; unauthorized: number };

const post = (path: string, body: unknown = {}) =>
  fetch(API + path, { method: "POST", body: JSON.stringify(body) }).then((response) => response.json());

/** Lê o estado do access token no storage: "ativa", "vencida" ou "ausente". */
function sessionState(): "ativa" | "vencida" | "ausente" {
  try {
    const stored = JSON.parse(localStorage.getItem(lab().storageKey) ?? "null");
    if (!stored?.token) return "ausente";
    const { exp } = JSON.parse(atob(stored.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Date.now() >= exp * 1000 ? "vencida" : "ativa";
  } catch {
    return "ausente";
  }
}

export function ControlPanel() {
  const [stats, setStats] = useState<Stats>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(async () => {
      tick((value) => value + 1);
      try {
        setStats(await fetch(API + "/__lab/stats").then((response) => response.json()));
      } catch {
        setStats(undefined);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const storeSession = async (expiredAccess: boolean) => {
    const tokens = await post("/__lab/session", { expiredAccess });
    localStorage.setItem(lab().storageKey, JSON.stringify({ token: tokens.access_token, refreshToken: tokens.refresh_token }));
    lab().sessionLost = false;
    lab().results.length = 0;
  };
  /** Prepara o cenário "token vencido": zera os contadores, mantém o carrinho e não dispara nenhuma request. */
  const expireToken = async () => {
    await post("/__lab/stats/reset");
    await storeSession(true);
    tick((value) => value + 1);
  };
  /** Volta ao ponto de partida: API limpa, sessão válida nova e os dois MFEs recarregados. */
  const resetScenario = async () => {
    setBusy(true);
    try {
      await post("/__lab/reset");
      await storeSession(false);
      await Promise.all(Object.values(lab().mfe).map((mfe) => mfe.refetch()));
      lab().results.length = 0;
    } finally {
      setBusy(false);
      tick((value) => value + 1);
    }
  };
  /** Como um usuário que volta à loja com o token vencido: os dois MFEs montam e consultam ao mesmo tempo. */
  const reloadExpired = async () => {
    await expireToken();
    // A seed sorteada só afeta o atraso do patch quando ele é carregado como MFE (?load=parcel).
    const url = new URL(location.href);
    url.searchParams.set("seed", String(1 + Math.floor(Math.random() * 1000)));
    url.searchParams.set("delay", "0"); // os dois MFEs montam juntos, como bundles carregados em paralelo
    location.href = url.toString();
  };
  /** O que o navegador faz quando o usuário volta para a aba: cada MFE revalida os seus dados ao mesmo tempo. */
  const returnToTab = () => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  };
  const fireAll = () => Promise.all(Object.values(lab().mfe).map((mfe) => mfe.refetch()));

  const session = sessionState();
  const hasErrors = lab().sessionLost || !stats || lab().results.some((result) => result.outcome === "error");
  const strategy = VARIANTS.find((variant) => variant.id === lab().variant);

  return (
    <aside className={`inspector ${open ? "inspector--open" : ""}`} aria-label="Inspector do laboratório">
      <button className="inspector__toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className={`inspector__signal ${hasErrors ? "inspector__signal--error" : ""}`} />
        <span>Inspector</span>
        <span className="inspector__chevron" aria-hidden="true">{open ? "×" : "+"}</span>
      </button>

      <div className="inspector__dock" aria-label="Valores da execução">
        <div className="dock__strategy"><span>Estratégia</span><strong>{strategy?.label ?? lab().variant}</strong></div>
        <div className="health-grid">
          <div><span>Sessão</span><strong className={session === "ativa" ? "is-ok" : "is-error"}>{session === "ativa" ? "Ativa" : session === "vencida" ? "Vencida" : "Ausente"}</strong></div>
          <div><span>Refresh</span><strong>{stats ? stats.refresh.calls : "—"}</strong></div>
          <div><span>Falhas</span><strong className={stats?.refresh.failed ? "is-error" : ""}>{stats?.refresh.failed ?? "—"}</strong></div>
          <div><span>401</span><strong className={stats?.unauthorized ? "is-error" : ""}>{stats?.unauthorized ?? "—"}</strong></div>
        </div>
        {!stats && <p className="dock__alert" role="alert">API indisponível na porta 4191.</p>}
        {lab().sessionLost && <p className="dock__alert" role="alert">Sessão encerrada: o refresh falhou.</p>}
        <div className="dock__actions">
          <button className="dock__btn" type="button" onClick={expireToken}>Vencer token</button>
          <button className="dock__btn" type="button" onClick={resetScenario} disabled={busy}>{busy ? "Resetando…" : "Resetar cenário"}</button>
        </div>
      </div>

      {open && (
        <div className="inspector__body">
          <div className="inspector__heading">
            <div><p className="inspector__title">Cenário de autenticação</p><p className="inspector__subtitle">Controle o experimento sem misturar o lab com a loja.</p></div>
            <Badge variant={hasErrors ? "destructive" : "secondary"}>{hasErrors ? "atenção" : "estável"}</Badge>
          </div>

          <section className="inspector__section" aria-labelledby="variant-title">
            <div className="inspector__section-title" id="variant-title">Estratégia em teste</div>
            <div className="variant-list">
              {VARIANTS.map((variant) => (
                <a className={`variant-option ${variant.id === lab().variant ? "variant-option--active" : ""}`} href={variant.href} key={variant.id}>
                  <span className="variant-option__radio" />
                  <span><strong>{variant.label}</strong><small>{variant.description}</small></span>
                </a>
              ))}
            </div>
          </section>

          <section className="inspector__section" aria-labelledby="actions-title">
            <div className="inspector__section-title" id="actions-title">Preparar cenário</div>
            <div className="inspector__actions">
              <Button size="sm" variant="outline" onClick={() => storeSession(false).then(() => tick((value) => value + 1))}>Token válido</Button>
              <Button size="sm" variant="outline" onClick={fireAll}>Executar ambos os MFEs</Button>
              <Button size="sm" variant="outline" onClick={returnToTab}>Voltar à aba (os MFEs revalidam)</Button>
              <Button size="sm" onClick={reloadExpired}>Recarregar a loja com token vencido</Button>
            </div>
          </section>

          <EventLog />
          <p className="inspector__meta">{lab().variant} · load {lab().load} · auth {lab().auth} · seed {lab().seed}</p>
        </div>
      )}
    </aside>
  );
}
