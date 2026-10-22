import { gql } from "@apollo/client/core";
import { Button } from "@shop-lab/ui";
import { lab, onReturnToTab, track, type OperationResult } from "@shop-lab/lab-protocol";
import { useCallback, useEffect, useState } from "react";
import { getClient } from "./client";

const QUERY = gql`query cart { cart { productId qty } }`;
type Row = { productId: string; qty: number };
const products: Record<string, { name: string; price: number; image: number }> = {
  p1: { name: "Tênis Move", price: 349, image: 0 },
  p2: { name: "Fone Aura", price: 599, image: 1 },
  p3: { name: "Mochila Trilho", price: 289, image: 2 },
  p4: { name: "Luminária Nimbo", price: 219, image: 3 },
};

export function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [last, setLast] = useState<OperationResult>();

  const refetch = useCallback(async (opts?: { signal?: AbortSignal }) => {
    setLast({ mfe: "cart", op: "cart", startedAt: performance.now(), outcome: "pending" });
    const result = await track("cart", "cart", async () => {
      const client = await getClient();
      const { data } = await client.query({ query: QUERY, fetchPolicy: "network-only", context: { fetchOptions: { signal: opts?.signal } } });
      setRows((data as { cart: Row[] }).cart);
    });
    setLast({ ...result });
    return result;
  }, []);

  useEffect(() => {
    lab().mfe.cart = { refetch };
    void refetch();
    const onChange = () => void refetch();
    window.addEventListener("cart:changed", onChange); // o catálogo avisa quando algo entra no carrinho
    const stopReturn = onReturnToTab(() => void refetch()); // revalida ao voltar para a aba
    return () => {
      window.removeEventListener("cart:changed", onChange);
      stopReturn();
      delete lab().mfe.cart; // o carrinho some das páginas sem ele (detalhe do produto)
    };
  }, [refetch]);

  const total = rows.reduce((sum, row) => sum + (products[row.productId]?.price ?? 0) * row.qty, 0);
  const isError = last?.outcome === "error" || last?.outcome === "aborted";
  return (
    <div className="cart-surface">
      <div className="cart-heading"><div><h2>Seu carrinho</h2><p>{rows.length ? `${rows.length} ${rows.length === 1 ? "item" : "itens"}` : "Pronto para receber suas escolhas"}</p></div><button type="button" onClick={() => void refetch()} aria-label="Atualizar carrinho">↻</button></div>

      {isError ? (
        <div className="commerce-alert commerce-alert--compact" role="alert"><div><strong>Carrinho indisponível</strong><span>{last?.detail || "Sua sessão pode ter expirado."}</span></div><Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div>
      ) : rows.length ? (
        <ul className="cart-list">{rows.map((row) => { const item = products[row.productId]; return <li key={row.productId}><div className={`cart-item__image product-card__image--${item?.image ?? 0}`} /><div><strong>{item?.name ?? row.productId}</strong><span>Quantidade {row.qty}</span></div><b>R$ {((item?.price ?? 0) * row.qty).toFixed(2).replace(".", ",")}</b></li>; })}</ul>
      ) : (
        <div className="cart-empty"><div className="cart-empty__bag" aria-hidden="true" /><strong>Seu carrinho está vazio</strong><p>Descubra a curadoria e adicione o que combina com a sua rotina.</p></div>
      )}

      <div className="cart-summary"><div><span>Subtotal</span><strong>R$ {total.toFixed(2).replace(".", ",")}</strong></div><div><span>Entrega</span><span>Calculada no checkout</span></div><Button size="lg" disabled={!rows.length}>Continuar para pagamento</Button></div>
      <div className={`mfe-status mfe-status--${last?.outcome ?? "pending"}`} aria-live="polite"><span className="mfe-status__dot" /><span>Carrinho</span><strong>{last?.outcome === "ok" ? "Sincronizado" : last?.outcome === "pending" ? "Atualizando" : "Com falha"}</strong></div>
    </div>
  );
}
