import { gql } from "@apollo/client/core";
import { Button } from "@shop-lab/ui";
import { lab, onReturnToTab, track, type OperationResult } from "@shop-lab/lab-protocol";
import { useCallback, useEffect, useState } from "react";
import { getClient } from "./client";

const QUERY = gql`query products { products { id name priceCents } }`;
const ADD_TO_CART = gql`mutation addToCart($productId: ID!) { addToCart(productId: $productId) { productId qty } }`;
type Row = { id: string; name: string; priceCents: number };

const productNotes: Record<string, string> = {
  p1: "Malha respirável · sola de alto retorno",
  p2: "Som imersivo · até 32 horas de bateria",
  p3: "Lona técnica · 28 litros",
  p4: "Luz regulável · bateria recarregável",
};
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

/** O catálogo é dono das rotas de produto: / (lista) e /produto/:id (detalhe). */
const productIdFromUrl = () => location.pathname.match(/^\/produto\/([^/]+)/)?.[1] ?? null;
function navigate(path: string, fromList = false) {
  history.pushState({ fromList }, "", path + location.search); // o single-spa avisa quem escuta popstate
}

export function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [last, setLast] = useState<OperationResult>();
  const [adding, setAdding] = useState<Partial<Record<string, OperationResult["outcome"]>>>({});
  const [addError, setAddError] = useState<string>();
  const [productId, setProductId] = useState(productIdFromUrl);

  const refetch = useCallback(async (opts?: { signal?: AbortSignal }) => {
    setLast({ mfe: "catalog", op: "products", startedAt: performance.now(), outcome: "pending" });
    const result = await track("catalog", "products", async () => {
      const client = await getClient();
      const { data } = await client.query({ query: QUERY, fetchPolicy: "network-only", context: { fetchOptions: { signal: opts?.signal } } });
      setRows((data as { products: Row[] }).products);
    });
    setLast({ ...result });
    return result;
  }, []);

  // Ação real do usuário: adiciona ao carrinho e avisa o MFE do carrinho por evento do navegador.
  const add = useCallback(async (row: Row) => {
    setAddError(undefined);
    setAdding((state) => ({ ...state, [row.id]: "pending" }));
    const result = await track("catalog", "addToCart", async () => {
      const client = await getClient();
      await client.mutate({ mutation: ADD_TO_CART, variables: { productId: row.id } });
    });
    setAdding((state) => ({ ...state, [row.id]: result.outcome }));
    if (result.outcome === "ok") {
      window.dispatchEvent(new CustomEvent("cart:changed"));
      setTimeout(() => setAdding((state) => (state[row.id] === "ok" ? { ...state, [row.id]: undefined } : state)), 1600);
    } else {
      setAddError(`Não foi possível adicionar ${row.name}. ${result.detail ?? ""}`);
    }
  }, []);

  useEffect(() => {
    lab().mfe.catalog = { refetch };
    const onNavigate = () => setProductId(productIdFromUrl());
    window.addEventListener("popstate", onNavigate); // pushState (via single-spa) e o botão Voltar do navegador
    const stopReturn = onReturnToTab(() => void refetch()); // refetchOnWindowFocus
    return () => {
      window.removeEventListener("popstate", onNavigate);
      stopReturn();
    };
  }, [refetch]);

  // Consulta ao montar e a cada mudança de página (lista ↔ detalhe): é isto que acontece ao clicar em Voltar.
  useEffect(() => {
    void refetch();
  }, [productId, refetch]);

  const isError = last?.outcome === "error" || last?.outcome === "aborted";
  const product = productId ? rows.find((row) => row.id === productId) : undefined;
  const label = (row: Row) => (adding[row.id] === "pending" ? "Adicionando…" : adding[row.id] === "ok" ? "Adicionado ✓" : adding[row.id] === "error" ? "Tentar novamente" : "Adicionar");

  return (
    <div className="catalog-surface">
      {productId ? (
        <button className="product-detail__back" type="button" onClick={() => (history.state?.fromList ? history.back() : navigate("/"))}>← Voltar</button>
      ) : (
        <div className="section-heading">
          <div><h2>Essenciais da semana</h2><p>Peças que resolvem a rotina com menos ruído.</p></div>
          <Button size="sm" variant="ghost" onClick={() => void refetch()} disabled={last?.outcome === "pending"}>Atualizar vitrine</Button>
        </div>
      )}

      {isError && (
        <div className="commerce-alert" role="alert">
          <div><strong>{productId ? "Não foi possível carregar o produto." : "Não foi possível carregar a vitrine."}</strong><span>{last?.detail || "A conexão foi interrompida."}</span></div>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      )}

      {addError && (
        <div className="commerce-alert" role="alert">
          <div><strong>Item não adicionado</strong><span>{addError}</span></div>
        </div>
      )}

      {productId ? (
        product ? (
          <article className="product-detail">
            <div className={`product-card__image product-detail__image product-card__image--${Number(product.id.slice(1)) - 1}`} role="img" aria-label={product.name} />
            <div className="product-detail__info">
              <h2>{product.name}</h2>
              <p>{productNotes[product.id] ?? "Seleção permanente do Ateliê"}. Feito para durar e para acompanhar a rotina sem chamar atenção.</p>
              <strong className="product-detail__price">{money(product.priceCents)}</strong>
              <button className="product-detail__add" type="button" disabled={adding[product.id] === "pending"} onClick={() => void add(product)}>{label(product)}</button>
            </div>
          </article>
        ) : last?.outcome === "pending" || !last ? (
          <div className="product-detail"><div className="product-skeleton" /></div>
        ) : isError ? null : (
          <p>Produto não encontrado.</p>
        )
      ) : last?.outcome === "pending" && !rows.length ? (
        <div className="product-grid" aria-label="Carregando produtos">{[0, 1, 2, 3].map((item) => <div className="product-skeleton" key={item} />)}</div>
      ) : (
        <ul className="product-grid">
          {rows.map((row, index) => (
            <li className="product-card" key={row.id}>
              <a className="product-card__link" href={`/produto/${row.id}${location.search}`} onClick={(event) => { event.preventDefault(); navigate(`/produto/${row.id}`, true); }}>
                <div className={`product-card__image product-card__image--${index % 4}`} role="img" aria-label={row.name}>
                  {index === 0 && <span className="product-card__tag">Mais escolhido</span>}
                </div>
              </a>
              <div className="product-card__body">
                <div>
                  <h3><a className="product-card__link" href={`/produto/${row.id}${location.search}`} onClick={(event) => { event.preventDefault(); navigate(`/produto/${row.id}`, true); }}>{row.name}</a></h3>
                  <p>{productNotes[row.id] ?? "Seleção permanente do Ateliê"}</p>
                </div>
                <div className="product-card__footer"><strong>{money(row.priceCents)}</strong><button type="button" aria-label={`Adicionar ${row.name} ao carrinho`} disabled={adding[row.id] === "pending"} onClick={() => void add(row)}>{label(row)}</button></div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className={`mfe-status mfe-status--${last?.outcome ?? "pending"}`} aria-live="polite">
        <span className="mfe-status__dot" /><span>Vitrine</span><strong>{last?.outcome === "ok" ? "Sincronizada" : last?.outcome === "pending" ? "Atualizando" : "Com falha"}</strong>
      </div>
    </div>
  );
}
