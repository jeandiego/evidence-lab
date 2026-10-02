const variants = [
  { name: 'Guarded', branches: '0', nesting: '0', policy: '1 tradução · 3 wirings', delta: '+4 / −1' },
  { name: 'Early return', branches: '12', nesting: '1', policy: '3 traduções', delta: '+3 / −0' },
  { name: 'Monolítico', branches: '12', nesting: '5', policy: '3 traduções', delta: '+33 / −21' },
]

export function EvidencePanel() {
  return (
    <section className="evidence-panel" aria-labelledby="evidence-title">
      <header className="evidence-intro">
        <div>
          <h2 id="evidence-title">A tese precisa sobreviver aos números.</h2>
          <p>
            O benchmark amplia a demo para três ações: publicar, arquivar e excluir.
            Primeiro provamos equivalência; só então comparamos políticas, branches e aninhamento.
          </p>
        </div>
        <dl className="evidence-summary" aria-label="Resumo da validação">
          <div><dt>casos</dt><dd>18/18</dd></div>
          <div><dt>observações</dt><dd>54</dd></div>
          <div><dt>testes</dt><dd>24</dd></div>
        </dl>
      </header>

      <div className="evidence-flow">
        <article className="evidence-column evidence-method">
          <header><span>Método</span><h3>Equivalência antes da comparação</h3></header>
          <ol>
            <li><strong>01</strong><span>Mesmo domínio</span><small>publicar · arquivar · excluir</small></li>
            <li><strong>02</strong><span>Mesmos cenários</span><small>sucesso · bloqueios · erro</small></li>
            <li><strong>03</strong><span>Mesma observação</span><small>resultado + trace + exceção</small></li>
          </ol>
          <p className="evidence-note">Equivalência é pré-condição. Não conta como vantagem de nenhuma variante.</p>
        </article>

        <article className="evidence-column evidence-code">
          <header><span>Código observado</span><h3>Estrutura extraída do AST</h3></header>
          <div className="metric-table" role="table" aria-label="Métricas estruturais por variante">
            <div className="metric-row metric-head" role="row">
              <span role="columnheader">variante</span><span role="columnheader">branches locais</span><span role="columnheader">if máx.</span>
            </div>
            {variants.map((variant) => (
              <div className="metric-row" role="row" key={variant.name}>
                <strong role="cell">{variant.name}</strong><code role="cell">{variant.branches}</code><code role="cell">{variant.nesting}</code>
              </div>
            ))}
          </div>
          <p className="metric-definition">Branches locais são nós de controle de fluxo presentes no código dos três handlers.</p>
        </article>

        <article className="evidence-column evidence-result">
          <header><span>Resultado</span><h3>Adicionar <code>editorial-lock</code></h3></header>
          <div className="change-results">
            {variants.map((variant) => (
              <div className="change-row" key={variant.name}>
                <strong>{variant.name}</strong>
                <span>{variant.policy}</span>
                <code>{variant.delta} linhas</code>
              </div>
            ))}
          </div>
          <p className="evidence-verdict">
            Guards centralizaram a tradução em allow/block, mas mantiveram três pontos explícitos de aplicação.
          </p>
        </article>
      </div>

      <footer className="runtime-strip">
        <div><span>custo secundário</span><strong>Overhead isolado do caminho de sucesso</strong></div>
        <dl>
          <div><dt>guarded</dt><dd>551 ns</dd></div>
          <div><dt>early return</dt><dd>37 ns</dd></div>
          <div><dt>monolítico</dt><dd>36 ns</dd></div>
        </dl>
        <p>Microbenchmark não prevê performance percebida na interface.</p>
      </footer>
    </section>
  )
}
