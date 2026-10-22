import { lab } from "@shop-lab/lab-protocol";

const labels: Record<string, string> = { catalog: "Vitrine", cart: "Carrinho" };
const ops: Record<string, string> = { products: "listar produtos", cart: "ler carrinho", addToCart: "adicionar ao carrinho" };

export function EventLog() {
  const results = lab().results;
  return (
    <section className="inspector__section" aria-labelledby="events-title">
      <div className="inspector__section-title" id="events-title">Últimas requisições</div>
      {!results.length ? (
        <p className="event-empty">Nenhuma chamada ainda. Execute os MFEs para acompanhar o fluxo.</p>
      ) : (
        <ul className="event-list">
          {results.slice(-8).reverse().map((result, index) => (
            <li key={`${result.startedAt}-${index}`} className={`event-row event-row--${result.outcome}`}>
              <span className="event-row__dot" />
              <span className="event-row__copy"><strong>{labels[result.mfe] ?? result.mfe} · {ops[result.op] ?? result.op}</strong><small>{result.detail || (result.outcome === "ok" ? "Resposta recebida" : result.outcome === "pending" ? "Aguardando resposta" : "Requisição cancelada")}</small></span>
              <span className="event-row__time">{result.endedAt ? `${Math.round(result.endedAt - result.startedAt)} ms` : "…"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
