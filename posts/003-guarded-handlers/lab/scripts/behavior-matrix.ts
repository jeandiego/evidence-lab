import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  article,
  createDependencies,
  scenarios,
  type ArticleAction,
} from '../src/benchmark/domain'
import { createEarlyReturnHandlers } from '../src/benchmark/early-return'
import { createGuardedHandlers } from '../src/benchmark/guarded'
import { createMonolithicHandlers } from '../src/benchmark/monolithic'

const here = dirname(fileURLToPath(import.meta.url))
const outputDirectory = resolve(here, '../../evidence')
const factories = {
  guarded: createGuardedHandlers,
  earlyReturn: createEarlyReturnHandlers,
  monolithic: createMonolithicHandlers,
}
const applicableScenarios: Record<ArticleAction, (keyof typeof scenarios)[]> = {
  publish: ['success', 'offline', 'editorialLocked', 'unauthorized', 'invalidContent', 'unconfirmed', 'actionError'],
  archive: ['success', 'offline', 'editorialLocked', 'unauthorized', 'actionError'],
  delete: ['success', 'offline', 'editorialLocked', 'unauthorized', 'unconfirmed', 'actionError'],
}

const cases = []

for (const [actionName, scenarioNames] of Object.entries(applicableScenarios)) {
  const action = actionName as ArticleAction

  for (const scenarioName of scenarioNames) {
    const observations = []

    for (const [variant, factory] of Object.entries(factories)) {
      const deps = createDependencies(scenarios[scenarioName])

      try {
        observations.push({
          variant,
          result: await factory(deps)[action](article),
          trace: deps.trace,
          error: null,
        })
      } catch (error) {
        observations.push({
          variant,
          result: null,
          trace: deps.trace,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const signatures = observations.map(({ result, trace, error }) =>
      JSON.stringify({ result, trace, error }),
    )

    cases.push({
      action,
      scenario: scenarioName,
      equivalent: new Set(signatures).size === 1,
      observations,
    })
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: 'Compare serialized result, ordered trace, and propagated error for each applicable action/scenario pair.',
  summary: {
    variants: Object.keys(factories).length,
    cases: cases.length,
    observations: cases.length * Object.keys(factories).length,
    equivalentCases: cases.filter((entry) => entry.equivalent).length,
  },
  cases,
}

await mkdir(outputDirectory, { recursive: true })
await writeFile(
  resolve(outputDirectory, 'behavior-matrix.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)

if (report.summary.equivalentCases !== report.summary.cases) {
  throw new Error('Behavioral equivalence failed; inspect behavior-matrix.json')
}

console.log(JSON.stringify(report.summary))
