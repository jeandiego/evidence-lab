import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowRightIcon,
  BugIcon,
  CheckCircle2Icon,
  Code2Icon,
  DatabaseIcon,
  DatabaseZapIcon,
  RotateCcwIcon,
  ServerIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { InspectorPanel } from "@/components/inspector-panel"
import { useA1Store } from "@/lib/a1-store"
import { compareSnapshots } from "@/lib/diff"
import { usePetLab } from "@/lib/lab-context"
import { applyCanonicalSnapshot, labStateKey, petsKey, SESSION_ID } from "@/lib/query"
import { cn } from "@/lib/utils"
import type { LabSnapshot, TimelineEvent } from "@pet-lab/contracts"

type Variant = "a1" | "a2"
type ResultView = "result" | "technical"

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function getVariant(): Variant {
  return new URLSearchParams(window.location.search).get("variant") === "a2" ? "a2" : "a1"
}

function setVariantOnUrl(variant: Variant) {
  const url = new URL(window.location.href)
  url.searchParams.set("variant", variant)
  window.history.replaceState({}, "", url)
}

export function LabWorkspace() {
  const lab = usePetLab()
  const queryClient = useQueryClient()
  const [variant, setVariant] = useState<Variant>(getVariant)
  const [hasRun, setHasRun] = useState(false)
  const normalizedInitialState = useRef(false)
  const timeline = useSyncExternalStore(lab.logger.subscribe, lab.logger.getSnapshot, lab.logger.getSnapshot)
  const a1Snapshot = useA1Store((state) => state.snapshot)
  const hydrateA1 = useA1Store((state) => state.hydrate)
  const applyPetOnly = useA1Store((state) => state.applyPetOnly)

  const stateQuery = useQuery({ queryKey: labStateKey, queryFn: () => lab.gateway.getState(SESSION_ID) })
  const petsQuery = useQuery({ queryKey: petsKey, queryFn: () => lab.gateway.listPets() })

  const resetMutation = useMutation({
    mutationFn: () => lab.gateway.reset(SESSION_ID),
    onSuccess(snapshot) {
      applyCanonicalSnapshot(queryClient, snapshot)
      hydrateA1(snapshot)
      setHasRun(false)
      lab.logger.log({ source: "scenario", label: "Cenário reiniciado", detail: "Servidor, Query Cache e Zustand voltaram para Luna" })
    },
  })

  const selectPetMutation = useMutation({
    mutationFn: () => lab.gateway.selectPet(SESSION_ID, "thor"),
    onSuccess(snapshot) {
      applyCanonicalSnapshot(queryClient, snapshot)
      if (variant === "a1") {
        applyPetOnly(snapshot)
        lab.logger.log({
          source: "zustand",
          label: "apply-pet-only",
          detail: "A action sincronizou o PET, mas manteve coverage, subtotal, desconto, total e revision antigos",
        })
      } else {
        lab.logger.log({ source: "query-cache", label: "setQueryData", detail: "A resposta completa substituiu a query lab-state" })
      }
      setHasRun(true)
    },
  })

  const normalizeScenario = resetMutation.mutate

  useEffect(() => {
    if (!stateQuery.data || normalizedInitialState.current) return
    normalizedInitialState.current = true
    normalizeScenario()
  }, [normalizeScenario, stateQuery.data])

  async function changeVariant(next: Variant) {
    if (next === variant) return
    setVariant(next)
    setVariantOnUrl(next)
    setHasRun(false)
    lab.logger.clear()
    await resetMutation.mutateAsync()
  }

  async function reset() {
    lab.logger.clear()
    await resetMutation.mutateAsync()
  }

  const serverSnapshot = stateQuery.data
  const clientSnapshot = variant === "a1" ? a1Snapshot : serverSnapshot
  const thor = petsQuery.data?.find((pet) => pet.id === "thor")
  const diff = compareSnapshots(serverSnapshot, clientSnapshot)
  const hasDivergence = hasRun && diff.some((row) => row.status === "diverged")
  const isPending = stateQuery.isPending || petsQuery.isPending || resetMutation.isPending || selectPetMutation.isPending
  const error = stateQuery.error ?? petsQuery.error ?? resetMutation.error ?? selectPetMutation.error

  return (
    <main className="synko-shell min-h-screen bg-background">
      <div className="synko-container">
        <header className="synko-masthead">
          <div className="synko-brand"><span aria-hidden="true" />SYNKO LAB</div>
          <span className="synko-issue">004 · STATE OWNERSHIP</span>
          <Button variant="ghost" size="sm" onClick={reset} disabled={isPending}><RotateCcwIcon data-icon="inline-start" />Reiniciar</Button>
        </header>

        <section className="synko-intro">
          <div>
            <h1>O servidor mudou. A tela <em>percebeu?</em></h1>
            <p>Troque Luna por Thor e rode o mesmo fluxo em duas arquiteturas. O lab mostra qual estado chegou à interface e o que ficou para trás.</p>
          </div>
          <div className="synko-contract">
            <span>estado observado</span>
            <code>PostgreSQL → GraphQL → UI</code>
          </div>
        </section>

        <section className="synko-variant-bar" aria-label="Arquitetura do experimento">
          <div>
            <p className="synko-technical-label">arquitetura</p>
            <ToggleGroup className="synko-variant-toggle" value={[variant]} onValueChange={(values) => values[0] && changeVariant(values[0] as Variant)} multiple={false} spacing={0} aria-label="Escolher variante">
              <ToggleGroupItem value="a1" data-testid="variant-a1"><BugIcon data-icon="inline-start" />A1 · Zustand global</ToggleGroupItem>
              <ToggleGroupItem value="a2" data-testid="variant-a2"><DatabaseZapIcon data-icon="inline-start" />A2 · State ownership</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p>{variant === "a1" ? "A interface lê um snapshot duplicado na store." : "A interface lê o snapshot canônico da query."}</p>
        </section>

        {error && <Alert variant="destructive"><BugIcon /><AlertTitle>O lab não conseguiu executar o cenário</AlertTitle><AlertDescription>{error.message}. Reinicie e tente novamente.</AlertDescription></Alert>}

        <Card className="synko-workbench">
          <CardHeader>
            <div>
              <p className="synko-technical-label">troca observada</p>
              <CardTitle>{hasRun ? "A interface acompanhou o servidor?" : "Troque Luna por Thor e acompanhe o preço."}</CardTitle>
              <CardDescription>{hasRun ? "O PET mudou nos dois lados. Agora compare cobertura, total e revisão." : "Luna está coberta pelo plano. O atendimento de Thor custa R$ 120."}</CardDescription>
            </div>
            <CardAction>
              <Badge variant={isPending ? "warning" : hasDivergence ? "destructive" : hasRun ? "success" : "secondary"} data-testid="overall-status">
                {isPending ? "Atualizando" : hasDivergence ? "Divergiu" : hasRun ? "Sincronizado" : "Pronto"}
              </Badge>
            </CardAction>
          </CardHeader>

          {!hasRun ? (
            <Scenario
              thorName={thor?.name ?? "Thor"}
              thorPrice={money(thor?.priceCents ?? 12000)}
              variant={variant}
              isPending={isPending}
              onRun={() => selectPetMutation.mutate()}
            />
          ) : serverSnapshot && clientSnapshot ? (
            <Result
              variant={variant}
              server={serverSnapshot}
              client={clientSnapshot}
              hasDivergence={hasDivergence}
              timeline={timeline}
              onNext={() => variant === "a1" ? changeVariant("a2") : reset()}
              isPending={isPending}
            />
          ) : null}
        </Card>
      </div>
    </main>
  )
}

function Scenario({ thorName, thorPrice, variant, isPending, onRun }: { thorName: string; thorPrice: string; variant: Variant; isPending: boolean; onRun: () => void }) {
  return (
    <>
      <CardContent>
        <div className="synko-scenario">
          <PetState name="Luna" coverage="Plano" total="Grátis" label="estado inicial" active />
          <div className="synko-connector"><span aria-hidden="true" /><ArrowRightIcon aria-hidden="true" /></div>
          <PetState name={thorName} coverage="Particular" total={thorPrice} label="troca solicitada" />
        </div>
        <span className="sr-only" data-testid="summary-pet">Luna</span>
        <span className="sr-only" data-testid="summary-total">Grátis</span>
      </CardContent>
      <Separator />
      <CardFooter className="synko-action-row">
        <p>{variant === "a1" ? "A action copia apenas o PET. É um erro comum: a tela parece atualizada, mas ainda usa a cobertura e o preço anteriores." : "A resposta completa substitui a query. PET, cobertura e preço mudam juntos."}</p>
        <Button size="lg" onClick={onRun} disabled={isPending} data-testid="switch-pet">Trocar para Thor<ArrowRightIcon data-icon="inline-end" /></Button>
      </CardFooter>
    </>
  )
}

function PetState({ name, coverage, total, label, active = false }: { name: string; coverage: string; total: string; label: string; active?: boolean }) {
  return (
    <article className={cn("synko-pet-state", active && "is-active")}>
      <span>{label}</span>
      <h3>{name}</h3>
      <dl>
        <div><dt>Cobertura</dt><dd>{coverage}</dd></div>
        <div><dt>Total</dt><dd>{total}</dd></div>
      </dl>
    </article>
  )
}

function Result({
  variant,
  server,
  client,
  hasDivergence,
  timeline,
  onNext,
  isPending,
}: {
  variant: Variant
  server: LabSnapshot
  client: LabSnapshot
  hasDivergence: boolean
  timeline: TimelineEvent[]
  onNext: () => void
  isPending: boolean
}) {
  const [view, setView] = useState<ResultView>("result")

  return (
    <div className="result-reveal">
      <div className="synko-result-tabs">
        <ToggleGroup value={[view]} onValueChange={(values) => values[0] && setView(values[0] as ResultView)} multiple={false} spacing={0} aria-label="Leitura do resultado">
          <ToggleGroupItem value="result"><CheckCircle2Icon data-icon="inline-start" />O que aconteceu</ToggleGroupItem>
          <ToggleGroupItem value="technical"><Code2Icon data-icon="inline-start" />Por baixo dos panos</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "result" ? (
        <CardContent className="synko-result-content">
          <div className="synko-comparison">
            <StateSummary icon={ServerIcon} label="Servidor · fonte canônica" snapshot={server} tone="neutral" />
              <StateSummary icon={variant === "a1" ? StoreIcon : DatabaseIcon} label={variant === "a1" ? "Interface · Zustand" : "Interface · Query Cache"} snapshot={client} tone={hasDivergence ? "danger" : "success"} />
          </div>

          {hasDivergence ? (
            <Alert variant="destructive" data-testid="diff-total">
              <BugIcon />
              <AlertTitle>A tela trocou o PET, mas manteve o preço da Luna.</AlertTitle>
              <AlertDescription>
                O servidor calculou <strong>{money(server.totalCents)}</strong> após <strong>{money(server.discountCents)}</strong> de desconto. A interface ainda mostra <strong data-testid="summary-total">{client.totalCents === 0 ? "Grátis" : money(client.totalCents)}</strong> porque a action não atualizou cobertura, preço, desconto, total e revisão.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="status-synced" data-testid="diff-total">
              <CheckCircle2Icon />
              <AlertTitle>A tela recebeu o snapshot completo.</AlertTitle>
              <AlertDescription>Servidor e interface mostram Thor com atendimento particular de <strong data-testid="summary-total">{money(client.totalCents)}</strong>.</AlertDescription>
            </Alert>
          )}
          <span className="sr-only" data-testid="summary-pet">{client.pet.name}</span>
        </CardContent>
      ) : (
        <CardContent className="synko-technical-view">
          <InspectorPanel server={server} client={client} clientLabel={variant === "a1" ? "Zustand global" : "TanStack Query Cache"} timeline={timeline} />
        </CardContent>
      )}

      <Separator />
      <CardFooter className="synko-result-footer">
        <p>{view === "result" ? "Abra Por baixo dos panos para ver o diff e a ordem das atualizações." : "O diff compara o snapshot da API com a fonte que renderiza a interface."}</p>
        <Button onClick={onNext} disabled={isPending} variant={variant === "a1" ? "default" : "outline"}>
          {variant === "a1" ? <>Executar a A2<ArrowRightIcon data-icon="inline-end" /></> : <><RotateCcwIcon data-icon="inline-start" />Repetir cenário</>}
        </Button>
      </CardFooter>
    </div>
  )
}

function StateSummary({ icon: Icon, label, snapshot, tone }: { icon: LucideIcon; label: string; snapshot: LabSnapshot; tone: "neutral" | "danger" | "success" }) {
  return (
    <section className={cn("synko-state-summary", tone === "danger" && "is-danger", tone === "success" && "is-success")}>
      <div><Icon aria-hidden="true" /><span>{label}</span></div>
      <dl>
        <div><dt>PET</dt><dd>{snapshot.pet.name}</dd></div>
        <div><dt>Cobertura</dt><dd>{snapshot.coverage.kind}</dd></div>
        <div><dt>Desconto</dt><dd>{money(snapshot.discountCents)}</dd></div>
        <div><dt>Total</dt><dd>{snapshot.totalCents === 0 ? "Grátis" : money(snapshot.totalCents)}</dd></div>
        <div><dt>Revisão</dt><dd>#{snapshot.revision}</dd></div>
      </dl>
    </section>
  )
}
