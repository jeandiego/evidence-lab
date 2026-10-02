import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type Concern = 'processing' | 'offer' | 'more-options' | 'availability' | 'selection'

type CodeLine = {
  text: string
  concern?: Concern
  marker?: string
}

type ConnectorGeometry = {
  id: Concern
  path: string
}

const problematicCode: CodeLine[] = [
  { text: 'async function handleSelectOption(option: Option) {' },
  { text: '  setProcessing(option.id)', concern: 'processing', marker: 'A' },
  { text: '' },
  { text: '  const runSelection = async () => {' },
  { text: '    if (activeOffer) {', concern: 'offer', marker: 'B' },
  { text: '      const confirmed = await confirmOfferChange(activeOffer)', concern: 'offer' },
  { text: '      if (!confirmed) return', concern: 'offer' },
  { text: '    }', concern: 'offer' },
  { text: '' },
  { text: "    if (option.kind === 'more-options') {", concern: 'more-options', marker: 'C' },
  { text: '      await openMoreOptions(option)', concern: 'more-options' },
  { text: '      return', concern: 'more-options' },
  { text: '    }', concern: 'more-options' },
  { text: '' },
  { text: '    await selectOption(option)', concern: 'selection', marker: 'E' },
  { text: '  }' },
  { text: '' },
  { text: '  try {' },
  { text: '    if (unavailableItems.length > 0) {', concern: 'availability', marker: 'D' },
  { text: '      return openUnavailableItemsDialog({', concern: 'availability' },
  { text: '        items: unavailableItems,', concern: 'availability' },
  { text: '        onContinue: runSelection,', concern: 'availability' },
  { text: '      })', concern: 'availability' },
  { text: '    }', concern: 'availability' },
  { text: '    return runSelection()' },
  { text: '  } finally {' },
  { text: '    clearProcessing()', concern: 'processing' },
  { text: '  }' },
  { text: '}' },
]

const policyCode = `const selectWithPolicies = composeGuards(selectOption, [
  requireOfferChangeConfirmation(activeOffer),
  requireAvailableItems({
    unavailableItems,
    openDialog: openUnavailableItemsDialog,
  }),
])`

const handlerCode = `async function handleSelectOption(option: Option) {
  setProcessing(option.id)

  try {
    if (option.kind === 'more-options') {
      return openMoreOptions(option)
    }

    return await selectWithPolicies(option)
  } finally {
    clearProcessing()
  }
}`

const stages = [
  {
    eyebrow: 'diagnóstico',
    title: 'Um handler, cinco responsabilidades',
    description: 'A–E estão corretos isoladamente. O custo aparece porque políticas, workflow e efeito principal exigem leitura simultânea.',
    active: ['processing', 'offer', 'more-options', 'availability', 'selection'] as Concern[],
    verdict: 'O tamanho é sintoma. A mistura de responsabilidades é o problema.',
  },
  {
    eyebrow: 'política 01',
    title: 'Confirmação é uma precondição assíncrona',
    description: 'B decide se a seleção pode continuar. Ela pode aguardar o usuário e bloquear sem executar a ação principal.',
    active: ['offer'] as Concern[],
    verdict: 'Candidata a guard: decide, interrompe e pode ser reutilizada.',
  },
  {
    eyebrow: 'política 02',
    title: 'Indisponibilidade também controla acesso',
    description: 'D abre uma interface intermediária e só entrega o controle à seleção quando existe consentimento para continuar.',
    active: ['availability'] as Concern[],
    verdict: 'Candidata a guard: o callback deixa de ficar enterrado no handler.',
  },
  {
    eyebrow: 'limite do padrão',
    title: 'Nem todo desvio deve virar guard',
    description: 'A e C pertencem ao workflow local: ciclo de processamento, rota alternativa e limpeza final continuam visíveis no handler.',
    active: ['processing', 'more-options'] as Concern[],
    verdict: 'Guard não é destino para todo if. Ele representa uma política de acesso à ação.',
  },
  {
    eyebrow: 'composição',
    title: 'O contrato fica legível antes da execução',
    description: 'As políticas são nomeadas e compostas; o handler volta a narrar apenas o workflow específico desta interação.',
    active: [] as Concern[],
    verdict: 'Duas políticas extraídas. Três responsabilidades locais preservadas.',
  },
] as const

const concerns = [
  { id: 'processing', marker: 'A', label: 'Estado transitório', description: 'abre e encerra o ciclo de processamento', kind: 'workflow' },
  { id: 'offer', marker: 'B', label: 'Confirmação da oferta', description: 'aguarda uma decisão e pode interromper', kind: 'guard' },
  { id: 'more-options', marker: 'C', label: 'Rota alternativa', description: 'desvia esta interação para outro efeito', kind: 'workflow' },
  { id: 'selection', marker: 'E', label: 'Ação principal', description: 'é o efeito que o handler pretende alcançar', kind: 'handler' },
  { id: 'availability', marker: 'D', label: 'Itens indisponíveis', description: 'suspende a ação atrás de um diálogo', kind: 'guard' },
] as const

export function AnatomyPanel() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [connectorGeometry, setConnectorGeometry] = useState<ConnectorGeometry[]>([])
  const [connectorBounds, setConnectorBounds] = useState({ width: 1, height: 1 })
  const workbenchRef = useRef<HTMLDivElement>(null)
  const codeAnchors = useRef<Partial<Record<Concern, HTMLElement>>>({})
  const readingAnchors = useRef<Partial<Record<Concern, HTMLElement>>>({})
  const stage = stages[step]

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    if (query.matches) setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing || reducedMotion || step === stages.length - 1) return
    const timer = window.setTimeout(() => setStep((current) => current + 1), 4200)
    return () => window.clearTimeout(timer)
  }, [playing, reducedMotion, step])

  const activeConcerns = useMemo(() => new Set<Concern>(stage.active), [stage.active])

  useLayoutEffect(() => {
    if (step === stages.length - 1) {
      setConnectorGeometry([])
      return
    }

    const workbench = workbenchRef.current
    if (!workbench) return

    const measure = () => {
      const bounds = workbench.getBoundingClientRect()
      const geometry = concerns.flatMap(({ id }) => {
        const source = codeAnchors.current[id]?.getBoundingClientRect()
        const target = readingAnchors.current[id]?.getBoundingClientRect()
        if (!source || !target) return []

        const startX = source.right - bounds.left
        const startY = source.top + source.height / 2 - bounds.top
        const endX = target.left - bounds.left
        const endY = target.top + target.height / 2 - bounds.top
        const bend = Math.max(36, (endX - startX) * 0.46)

        return [{
          id,
          path: `M${startX} ${startY} C${startX + bend} ${startY} ${endX - bend} ${endY} ${endX} ${endY}`,
        }]
      })

      setConnectorBounds({ width: bounds.width, height: bounds.height })
      setConnectorGeometry(geometry)
    }

    const frame = window.requestAnimationFrame(measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(workbench)
    document.fonts?.ready.then(measure)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [step, stage.title])

  const chooseStep = (nextStep: number) => {
    setStep(nextStep)
    setPlaying(false)
  }

  const restart = () => {
    setStep(0)
    setPlaying(!reducedMotion)
  }

  return (
    <section className="anatomy-panel" aria-labelledby="anatomy-title">
      <header className="anatomy-intro">
        <div>
          <h2 id="anatomy-title">Anatomia de um handler que sabe demais.</h2>
          <p>
            Parta do código problemático e acompanhe a separação entre políticas de acesso,
            workflow local e ação principal.
          </p>
        </div>
        <div className="anatomy-controls">
          <div className="anatomy-actions">
            <button className="secondary" type="button" onClick={restart}>Reiniciar anatomia</button>
            {!reducedMotion && (
              <button className="anatomy-play" type="button" onClick={() => setPlaying((current) => !current)}>
                {playing && step < stages.length - 1 ? 'Pausar' : 'Continuar'}
              </button>
            )}
          </div>
          <label htmlFor="anatomy-range">
            <span>Etapa {step + 1} de {stages.length}</span>
            <strong>{stage.eyebrow}</strong>
          </label>
          <input
            id="anatomy-range"
            type="range"
            min="0"
            max={stages.length - 1}
            step="1"
            value={step}
            aria-valuetext={`${stage.eyebrow}: ${stage.title}`}
            onChange={(event) => chooseStep(Number(event.target.value))}
          />
          <div className="anatomy-ticks" aria-hidden="true">
            {stages.map((item, index) => <span key={item.eyebrow} data-reached={index <= step}>{index + 1}</span>)}
          </div>
        </div>
      </header>

      <div className="anatomy-workbench" aria-live="polite" data-step={step} ref={workbenchRef}>
        <div className="anatomy-specimen" key={`specimen-${step}`}>
          <div className="anatomy-code-window">
          <div className="code-bar">
            <span>{step === stages.length - 1 ? 'selection-with-policies.ts' : 'selection-handler.ts'}</span>
            <span>{step === stages.length - 1 ? 'depois' : 'antes'}</span>
          </div>
          {step === stages.length - 1 ? (
            <div className="anatomy-final-code">
              <div>
                <span>políticas de acesso</span>
                <pre><code>{policyCode}</code></pre>
              </div>
              <div>
                <span>workflow local</span>
                <pre><code>{handlerCode}</code></pre>
              </div>
            </div>
          ) : (
            <pre className="anatomy-source" aria-label="Handler problemático anotado">
              <code>
                {problematicCode.map((line, index) => {
                  const relevant = line.concern && activeConcerns.has(line.concern)
                  return (
                    <span
                      className="anatomy-line"
                      data-relevant={relevant || undefined}
                      data-muted={line.concern && !relevant || undefined}
                      data-concern={line.concern}
                      key={`${index}-${line.text}`}
                    >
                      <span className="line-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="line-code">{line.text || ' '}</span>
                      {line.marker && (
                        <b
                          aria-label={`Anotação ${line.marker}`}
                          ref={(element) => {
                            if (line.concern && element) codeAnchors.current[line.concern] = element
                          }}
                        >
                          {line.marker}
                        </b>
                      )}
                    </span>
                  )
                })}
              </code>
            </pre>
          )}
          </div>
        </div>

        {step < stages.length - 1 && (
          <svg
            className="anatomy-connectors"
            viewBox={`0 0 ${connectorBounds.width} ${connectorBounds.height}`}
            aria-hidden="true"
          >
            {connectorGeometry.map((connector) => (
              <path
                key={connector.id}
                d={connector.path}
                data-active={activeConcerns.has(connector.id as Concern) || undefined}
              />
            ))}
          </svg>
        )}

        <aside className="anatomy-reading" key={`reading-${step}`}>
          <span className="anatomy-step-label">{String(step + 1).padStart(2, '0')} · {stage.eyebrow}</span>
          <h3>{stage.title}</h3>
          <p>{stage.description}</p>

          <ol className="concern-map" aria-label="Responsabilidades do handler">
            {concerns.map((concern) => {
              const active = step === 0 || activeConcerns.has(concern.id)
              const extracted = step === stages.length - 1 && concern.kind === 'guard'
              return (
                <li key={concern.id} data-active={active || undefined} data-extracted={extracted || undefined}>
                  <span
                    data-anchor={concern.id}
                    ref={(element) => {
                      if (element) readingAnchors.current[concern.id] = element
                    }}
                  >
                    {concern.marker}
                  </span>
                  <div>
                    <strong>{concern.label}</strong>
                    <small>{concern.description}</small>
                  </div>
                  <em>{extracted ? 'extraído para guard' : concern.kind === 'guard' ? 'política candidata' : concern.kind}</em>
                </li>
              )
            })}
          </ol>

          <blockquote>{stage.verdict}</blockquote>
        </aside>
      </div>
    </section>
  )
}
