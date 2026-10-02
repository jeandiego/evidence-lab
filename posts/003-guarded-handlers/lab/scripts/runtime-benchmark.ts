import { writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { article, type Dependencies } from '../src/benchmark/domain'
import { createEarlyReturnHandlers } from '../src/benchmark/early-return'
import { createGuardedHandlers } from '../src/benchmark/guarded'
import { createMonolithicHandlers } from '../src/benchmark/monolithic'

const here = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(here, '../../evidence/runtime-benchmark.json')
const iterations = 20_000
const warmupIterations = 2_000
const samples = 9

function createNoopDependencies(): Dependencies {
  return {
    trace: [],
    isOnline: () => true,
    isEditorialLocked: () => false,
    canPerform: () => true,
    isContentValid: () => true,
    isConfirmed: () => true,
    recordBlocked: () => undefined,
    execute: (action, currentArticle) => ({ action, articleId: currentArticle.id }),
  }
}

const handlers = {
  guarded: createGuardedHandlers(createNoopDependencies()).publish,
  earlyReturn: createEarlyReturnHandlers(createNoopDependencies()).publish,
  monolithic: createMonolithicHandlers(createNoopDependencies()).publish,
}

async function run(handler: (typeof handlers)[keyof typeof handlers], count: number) {
  for (let index = 0; index < count; index += 1) await handler(article)
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

const measurements = []

for (const [variant, handler] of Object.entries(handlers)) {
  await run(handler, warmupIterations)
  const nanosecondsPerOperation = []

  for (let sample = 0; sample < samples; sample += 1) {
    const start = performance.now()
    await run(handler, iterations)
    nanosecondsPerOperation.push(((performance.now() - start) * 1_000_000) / iterations)
  }

  measurements.push({
    variant,
    medianNanosecondsPerOperation: Math.round(percentile(nanosecondsPerOperation, 0.5)),
    p95NanosecondsPerOperation: Math.round(percentile(nanosecondsPerOperation, 0.95)),
    samplesNanosecondsPerOperation: nanosecondsPerOperation.map(Math.round),
  })
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
  },
  methodology: {
    path: 'Successful publish path using synchronous policies wrapped in the handlers async contract.',
    iterationsPerSample: iterations,
    warmupIterations,
    samples,
    warning: 'Microbenchmark isolates orchestration overhead. It does not predict user-perceived UI performance and should not support the primary thesis.',
  },
  measurements,
}

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(measurements))
