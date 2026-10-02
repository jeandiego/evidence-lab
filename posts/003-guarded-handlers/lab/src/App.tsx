import { useCallback, useMemo, useRef, useState } from 'react'

import { AnatomyPanel } from './AnatomyPanel'
import { CodeComparison } from './CodeComparison'
import { EvidencePanel } from './EvidencePanel'
import { createGuard, type GuardedResult } from './guards'
import { useGuardedHandler } from './use-guarded-handler'

type StepId = 'online' | 'permission' | 'confirmation' | 'handler'
type StepState = 'idle' | 'running' | 'passed' | 'blocked' | 'skipped' | 'executed' | 'error'

type TraceEntry = {
  id: number
  step: StepId
  state: Exclude<StepState, 'idle' | 'skipped'>
  message: string
}

type Receipt = {
  articleId: string
  publishedAt: string
}

const steps: Array<{ id: StepId; label: string; code: string }> = [
  { id: 'online', label: 'Conectividade', code: 'requireOnline()' },
  { id: 'permission', label: 'Permissão', code: 'requirePermission()' },
  { id: 'confirmation', label: 'Confirmação', code: 'requireConfirmation()' },
  { id: 'handler', label: 'Ação', code: 'publishArticle()' },
]

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration))

function Toggle({
  checked,
  disabled,
  label,
  description,
  trueLabel = 'passa',
  falseLabel = 'bloqueia',
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  description: string
  trueLabel?: string
  falseLabel?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch" aria-hidden="true"><span /></span>
      <span className="toggle-value">{checked ? trueLabel : falseLabel}</span>
    </label>
  )
}

function getStepState(
  step: StepId,
  trace: TraceEntry[],
  result: GuardedResult<Receipt> | undefined,
  failed: boolean,
): StepState {
  const last = [...trace].reverse().find((entry) => entry.step === step)
  if (last) return last.state

  if (result?.status === 'blocked') {
    const blockedIndex = steps.findIndex((candidate) => candidate.id === result.guard)
    const currentIndex = steps.findIndex((candidate) => candidate.id === step)
    if (currentIndex > blockedIndex) return 'skipped'
  }

  if (failed && step !== 'handler') return 'passed'
  return 'idle'
}

const stateLabels: Record<StepState, string> = {
  idle: 'aguardando',
  running: 'avaliando',
  passed: 'passou',
  blocked: 'bloqueou',
  skipped: 'não executado',
  executed: 'executou',
  error: 'falhou',
}

export function App() {
  const [activeView, setActiveView] = useState<'anatomy' | 'execution' | 'code' | 'evidence'>('anatomy')
  const [online, setOnline] = useState(true)
  const [allowed, setAllowed] = useState(true)
  const [confirmed, setConfirmed] = useState(true)
  const [actionSucceeds, setActionSucceeds] = useState(true)
  const [trace, setTrace] = useState<TraceEntry[]>([])
  const [result, setResult] = useState<GuardedResult<Receipt>>()
  const [error, setError] = useState<string>()
  const [running, setRunning] = useState(false)
  const traceId = useRef(0)

  const appendTrace = useCallback((step: StepId, state: TraceEntry['state'], message: string) => {
    const id = ++traceId.current
    setTrace((current) => [...current, { id, step, state, message }])
  }, [])

  const publishArticle = useCallback(async (): Promise<Receipt> => {
    appendTrace('handler', 'running', 'A ação recebeu o controle da pipeline.')
    await wait(440)

    if (!actionSucceeds) {
      appendTrace('handler', 'error', 'A publicação lançou um erro inesperado.')
      throw new Error('A API recusou a publicação.')
    }

    appendTrace('handler', 'executed', 'Artigo publicado; o retorno foi preservado.')
    return { articleId: 'article-003', publishedAt: new Date().toLocaleTimeString('pt-BR') }
  }, [actionSucceeds, appendTrace])

  const guards = useMemo(() => {
    const instrument = (
      step: Exclude<StepId, 'handler'>,
      passes: boolean,
      failReason: string,
    ) => createGuard<[]>({
      name: step,
      condition: async () => {
        appendTrace(step, 'running', `Executando ${step}.`)
        await wait(440)
        appendTrace(
          step,
          passes ? 'passed' : 'blocked',
          passes ? 'Condição atendida; chamando next().' : `Pipeline interrompida: ${failReason}.`,
        )
        return passes ? true : { allow: false, reason: failReason }
      },
    })

    return [
      instrument('online', online, 'offline'),
      instrument('permission', allowed, 'not-authorized'),
      instrument('confirmation', confirmed, 'cancelled'),
    ]
  }, [allowed, appendTrace, confirmed, online])

  const guardedPublish = useGuardedHandler(publishArticle, guards)

  const execute = async () => {
    setRunning(true)
    setTrace([])
    setResult(undefined)
    setError(undefined)

    try {
      const nextResult = await guardedPublish()
      setResult(nextResult)
    } catch (executionError) {
      setError(executionError instanceof Error ? executionError.message : 'Falha desconhecida')
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setTrace([])
    setResult(undefined)
    setError(undefined)
  }

  const outcome = error
    ? { label: 'erro inesperado', detail: error, tone: 'error' }
    : result?.status === 'blocked'
      ? { label: 'execução bloqueada', detail: `${result.guard} · ${String(result.reason)}`, tone: 'blocked' }
      : result?.status === 'executed'
        ? { label: 'ação executada', detail: `receipt · ${result.value.publishedAt}`, tone: 'success' }
        : running
          ? { label: 'pipeline em execução', detail: 'aguarde a próxima decisão', tone: 'running' }
          : { label: 'pronta para executar', detail: 'ajuste as condições e publique', tone: 'idle' }

  const views = ['anatomy', 'execution', 'code', 'evidence'] as const

  const selectView = (view: typeof views[number]) => {
    setActiveView(view)
    window.requestAnimationFrame(() => document.getElementById(`tab-${view}`)?.focus())
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const current = views.indexOf(activeView)
      const direction = event.key === 'ArrowRight' ? 1 : -1
      selectView(views[(current + direction + views.length) % views.length])
    }
    if (event.key === 'Home') {
      event.preventDefault()
      selectView('anatomy')
    }
    if (event.key === 'End') {
      event.preventDefault()
      selectView('evidence')
    }
  }

  return (
    <main>
      <header className="masthead">
        <a className="brand" href="/" target="_top" aria-label="Voltar para o Evidence Lab">
          <span /> Evidence Lab
        </a>
        <span className="issue">Nº 003 · guarded handlers</span>
      </header>

      <section className="intro">
        <div>
          <h1>Veja uma ação atravessar seus <em>guards.</em></h1>
          <p>
            Execute a pipeline, interrompa cada condição e compare três maneiras de
            organizar o mesmo fluxo. Comportamento primeiro; código logo ao lado.
          </p>
        </div>
        <div className="contract">
          <span>contrato observado</span>
          <code>guard(next) → handler</code>
        </div>
      </section>

      <nav className="view-tabs" role="tablist" aria-label="Modos do laboratório">
        <button
          id="tab-anatomy"
          type="button"
          role="tab"
          aria-selected={activeView === 'anatomy'}
          aria-controls="panel-anatomy"
          tabIndex={activeView === 'anatomy' ? 0 : -1}
          onClick={() => setActiveView('anatomy')}
          onKeyDown={handleTabKeyDown}
        >
          Anatomia
          <small>do problema ao guard</small>
        </button>
        <button
          id="tab-execution"
          type="button"
          role="tab"
          aria-selected={activeView === 'execution'}
          aria-controls="panel-execution"
          tabIndex={activeView === 'execution' ? 0 : -1}
          onClick={() => setActiveView('execution')}
          onKeyDown={handleTabKeyDown}
        >
          Execução
          <small>pipeline interativa</small>
        </button>
        <button
          id="tab-code"
          type="button"
          role="tab"
          aria-selected={activeView === 'code'}
          aria-controls="panel-code"
          tabIndex={activeView === 'code' ? 0 : -1}
          onClick={() => setActiveView('code')}
          onKeyDown={handleTabKeyDown}
        >
          Código
          <small>três versões</small>
        </button>
        <button
          id="tab-evidence"
          type="button"
          role="tab"
          aria-selected={activeView === 'evidence'}
          aria-controls="panel-evidence"
          tabIndex={activeView === 'evidence' ? 0 : -1}
          onClick={() => setActiveView('evidence')}
          onKeyDown={handleTabKeyDown}
        >
          Evidências
          <small>números e testes</small>
        </button>
      </nav>

      <div
        id="panel-anatomy"
        role="tabpanel"
        aria-labelledby="tab-anatomy"
        hidden={activeView !== 'anatomy'}
      >
        <AnatomyPanel />
      </div>

      <section
        id="panel-execution"
        className="workbench"
        role="tabpanel"
        aria-labelledby="tab-execution"
        hidden={activeView !== 'execution'}
      >
        <aside className="controls">
          <div className="section-heading">
            <h2>Condições</h2>
            <p>Os três primeiros recompõem os guards; o último configura o handler.</p>
          </div>

          <div className="toggles">
            <Toggle checked={online} disabled={running} label="Conectividade" description="navigator.onLine" onChange={(value) => { setOnline(value); reset() }} />
            <Toggle checked={allowed} disabled={running} label="Permissão" description="user.canPublish" onChange={(value) => { setAllowed(value); reset() }} />
            <Toggle checked={confirmed} disabled={running} label="Confirmação" description="dialog result" onChange={(value) => { setConfirmed(value); reset() }} />
            <Toggle
              checked={actionSucceeds}
              disabled={running}
              label="Ação principal"
              description="API response"
              trueLabel="sucesso"
              falseLabel="falha"
              onChange={(value) => { setActionSucceeds(value); reset() }}
            />
          </div>

          <div className="actions">
            <button className="primary" type="button" disabled={running} onClick={() => void execute()}>
              {running ? 'Executando…' : 'Executar pipeline'}
            </button>
            <button className="secondary" type="button" disabled={running || trace.length === 0} onClick={reset}>
              Limpar
            </button>
          </div>
        </aside>

        <div className="stage">
          <div className="outcome" data-tone={outcome.tone} aria-live="polite">
            <span className="outcome-dot" />
            <div>
              <strong>{outcome.label}</strong>
              <code>{outcome.detail}</code>
            </div>
          </div>

          <ol className="pipeline" aria-label="Etapas da pipeline">
            {steps.map((step, index) => {
              const state = getStepState(step.id, trace, result, Boolean(error))
              return (
                <li key={step.id} className="pipeline-step" data-state={state}>
                  <div className="node">
                    <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <code>{step.code}</code>
                    </div>
                    <span className="node-status">{stateLabels[state]}</span>
                  </div>
                  {index < steps.length - 1 && <span className="connector" aria-hidden="true" />}
                </li>
              )
            })}
          </ol>

          <div className="trace-region">
            <div className="section-heading horizontal">
              <div>
                <h2>Trace da execução</h2>
                <p>Somente etapas realmente alcançadas entram no registro.</p>
              </div>
              <span>{trace.length} eventos</span>
            </div>

            {trace.length === 0 ? (
              <div className="empty-trace">Execute a pipeline para produzir evidência.</div>
            ) : (
              <ol className="trace" aria-live="polite">
                {trace.map((entry, index) => (
                  <li key={entry.id} data-state={entry.state}>
                    <span className="trace-order">{String(index + 1).padStart(2, '0')}</span>
                    <code>{entry.step}</code>
                    <span>{entry.message}</span>
                    <strong>{stateLabels[entry.state]}</strong>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
      <div
        id="panel-code"
        role="tabpanel"
        aria-labelledby="tab-code"
        hidden={activeView !== 'code'}
      >
        <CodeComparison />
      </div>
      <div
        id="panel-evidence"
        role="tabpanel"
        aria-labelledby="tab-evidence"
        hidden={activeView !== 'evidence'}
      >
        <EvidencePanel />
      </div>
    </main>
  )
}
