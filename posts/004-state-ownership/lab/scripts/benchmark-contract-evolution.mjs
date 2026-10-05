import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const baseline = {
  sessionId: "benchmark",
  pet: { id: "luna", name: "Luna", species: "Gata" },
  coverage: { kind: "PLAN", label: "Plano" },
  items: [{ id: "annual-vaccine", name: "Vacina anual", priceCents: 0 }],
  totalCents: 0,
  revision: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const evolvedServerSnapshot = {
  sessionId: "benchmark",
  pet: { id: "thor", name: "Thor", species: "Cachorro" },
  coverage: { kind: "PRIVATE", label: "Particular" },
  items: [{ id: "annual-vaccine", name: "Vacina anual", priceCents: 14000 }],
  subtotalCents: 14000,
  discountCents: 2000,
  totalCents: 12000,
  revision: 2,
  updatedAt: "2026-01-02T00:00:00.000Z",
}

// Simula uma action correta antes da evolução: todos os campos conhecidos eram
// copiados manualmente. Os dois campos novos não entram até alguém lembrar dela.
const applyKnownContractManually = (_previous, server) => ({
  sessionId: server.sessionId,
  pet: server.pet,
  coverage: server.coverage,
  items: server.items,
  totalCents: server.totalCents,
  revision: server.revision,
  updatedAt: server.updatedAt,
})

// A2 não conhece os campos: apenas substitui o snapshot pela resposta canônica.
const replaceWithCanonicalSnapshot = (_previous, server) => server

const fieldPaths = [
  "pet.id",
  "coverage.kind",
  "items[0].priceCents",
  "subtotalCents",
  "discountCents",
  "totalCents",
  "revision",
]

const read = (snapshot, field) => {
  if (field === "items[0].priceCents") return snapshot.items?.[0]?.priceCents
  return field.split(".").reduce((value, key) => value?.[key], snapshot)
}

const evaluate = (client) => {
  const divergentFields = fieldPaths.filter((field) => read(client, field) !== read(evolvedServerSnapshot, field))
  return { invariantPreserved: divergentFields.length === 0, divergentFields }
}

const a1 = evaluate(applyKnownContractManually(baseline, evolvedServerSnapshot))
const a2 = evaluate(replaceWithCanonicalSnapshot(baseline, evolvedServerSnapshot))
const generatedAt = new Date().toISOString()
const report = {
  schemaVersion: 1,
  benchmark: "contract-evolution",
  generatedAt,
  question: "Quanto da lógica de sincronização precisa mudar quando o servidor adiciona campos derivados ao snapshot?",
  contractEvolution: {
    addedFields: ["subtotalCents", "discountCents"],
    serverCalculation: "totalCents = subtotalCents - discountCents",
  },
  invariant: "Após uma resposta confirmada, a fonte que renderiza a UI deve ser semanticamente igual ao snapshot canônico.",
  variants: {
    a1ManualProjection: {
      ...a1,
      synchronizationLocationsRequiringChange: 1,
      actionChangesRequired: 1,
      reason: "A action enumera os campos conhecidos e ignora silenciosamente os campos adicionados ao contrato.",
    },
    a2CanonicalReplacement: {
      ...a2,
      synchronizationLocationsRequiringChange: 0,
      actionChangesRequired: 0,
      reason: "A resposta canônica substitui o snapshot; a lógica de sincronização não enumera campos.",
    },
  },
  measurements: {
    addedContractFields: 2,
    a1NewDivergences: a1.divergentFields.length,
    a2NewDivergences: a2.divergentFields.length,
    synchronizationChangeAmplification: {
      a1: 1,
      a2: 0,
      unit: "sync locations changed per contract evolution",
    },
  },
  limitations: [
    "Benchmark estrutural e determinístico; não mede renderização, latência ou memória.",
    "A1 usa uma única action para isolar o mecanismo; sistemas reais podem ter vários escritores e amplificação maior.",
    "A2 ainda pode exigir adaptação da apresentação para exibir o campo, mas não da reconciliação do snapshot.",
  ],
}

if (a1.invariantPreserved || !a2.invariantPreserved) {
  throw new Error("Resultado inesperado: o benchmark deixou de distinguir projeção manual e substituição canônica")
}

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const reportsDir = path.join(labRoot, "reports")
const output = path.join(reportsDir, "contract-evolution-benchmark.json")
await mkdir(reportsDir, { recursive: true })
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ output, measurements: report.measurements }, null, 2))
