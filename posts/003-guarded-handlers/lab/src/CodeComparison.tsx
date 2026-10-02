import { useState } from 'react'

import { comparisonSamples, frameworkSamples, type CodeSample } from './code-samples'

function CodeWindow({ sample, compact = false }: { sample: CodeSample; compact?: boolean }) {
  return (
    <article className="code-column" data-variant={sample.id}>
      <header className="code-column-heading">
        <div>
          <h3>{sample.title}</h3>
          <p>{sample.description}</p>
        </div>
        <span>{sample.filename}</span>
      </header>
      <div className="code-window" data-compact={compact || undefined}>
        <div className="code-bar">
          <span>{sample.filename}</span>
          <span>TypeScript</span>
        </div>
        <pre><code>{sample.code}</code></pre>
      </div>
    </article>
  )
}

export function CodeComparison() {
  const [framework, setFramework] = useState('react')
  const activeFramework = frameworkSamples.find((sample) => sample.id === framework) ?? frameworkSamples[0]

  const selectFramework = (id: string) => {
    setFramework(id)
    window.requestAnimationFrame(() => document.getElementById(`framework-tab-${id}`)?.focus())
  }

  const handleFrameworkKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = frameworkSamples.findIndex((sample) => sample.id === framework)
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const direction = event.key === 'ArrowRight' ? 1 : -1
      const next = (index + direction + frameworkSamples.length) % frameworkSamples.length
      selectFramework(frameworkSamples[next].id)
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      selectFramework(event.key === 'Home' ? frameworkSamples[0].id : frameworkSamples.at(-1)!.id)
    }
  }

  return (
    <section className="code-comparison" aria-label="Comparação de implementações">
      <div className="comparison-intro">
        <div>
          <h2>Mesmo caso de uso. Três formas de organizar o fluxo.</h2>
          <p>
            Publicar um artigo exige conexão, permissão de autoria e confirmação.
            O comportamento é equivalente; o que muda é onde cada decisão vive.
          </p>
        </div>
        <div className="case-contract">
          <span>caso observado</span>
          <strong>publicação protegida</strong>
          <code>online → permission → confirmation → publish</code>
        </div>
      </div>

      <div
        className="code-grid"
        tabIndex={0}
        role="region"
        aria-label="Três implementações do fluxo de publicação"
        aria-describedby="code-grid-help"
      >
        <p id="code-grid-help" className="sr-only">
          Em telas estreitas, use as setas para percorrer as três implementações.
        </p>
        {comparisonSamples.map((sample) => <CodeWindow key={sample.id} sample={sample} />)}
      </div>

      <footer className="framework-section">
        <div className="framework-copy">
          <div>
            <h2>O núcleo não conhece o framework.</h2>
            <p>
              React originou o hook. A composição continua JavaScript puro:
              Angular Signals e Vue refs entram apenas como fontes de estado.
              Os adapters Angular e Vue são ilustrativos; somente a integração React é executada neste lab.
            </p>
          </div>
          <code>composeGuards(handler, guards)</code>
        </div>

        <div className="framework-tabs" role="tablist" aria-label="Frameworks">
          {frameworkSamples.map((sample) => (
            <button
              key={sample.id}
              id={`framework-tab-${sample.id}`}
              type="button"
              role="tab"
              aria-selected={framework === sample.id}
              aria-controls="framework-code"
              tabIndex={framework === sample.id ? 0 : -1}
              className={framework === sample.id ? 'active' : ''}
              onClick={() => setFramework(sample.id)}
              onKeyDown={handleFrameworkKeyDown}
            >
              {sample.title}
              {sample.id === 'react' && <small>origem</small>}
            </button>
          ))}
        </div>

        <div
          id="framework-code"
          role="tabpanel"
          aria-labelledby={`framework-tab-${activeFramework.id}`}
        >
          <CodeWindow sample={activeFramework} compact />
        </div>
      </footer>
    </section>
  )
}
