import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const labRoot = resolve(here, '..')
const fixtureRoot = resolve(labRoot, 'fixtures/change-amplification/before')
const evidenceRoot = resolve(labRoot, '../evidence')
const sources = {
  guarded: 'src/benchmark/guarded.ts',
  earlyReturn: 'src/benchmark/early-return.ts',
  monolithic: 'src/benchmark/monolithic.ts',
}

function inspect(text: string, path: string) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  let decisionPoints = 0
  let maxIfNesting = 0
  let policyDecisionLocations = 0
  let policyWiringLocations = 0
  const handlers: Record<string, string> = {}

  function visit(node: ts.Node, depth = 0) {
    const nextDepth = ts.isIfStatement(node) ? depth + 1 : depth
    if (ts.isIfStatement(node)) {
      decisionPoints += 1
      maxIfNesting = Math.max(maxIfNesting, nextDepth)
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'isEditorialLocked') {
      policyDecisionLocations += 1
    }
    if (ts.isArrayLiteralExpression(node)) {
      policyWiringLocations += node.elements.filter(
        (element) => ts.isIdentifier(element) && element.text === 'editorialLock',
      ).length
    }
    if (
      ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) &&
      ['publish', 'archive', 'delete'].includes(node.name.text)
    ) {
      handlers[node.name.text] = node.initializer.getText(source)
    }
    ts.forEachChild(node, (child) => visit(child, nextDepth))
  }
  visit(source)

  return {
    decisionPoints,
    maxIfNesting,
    nonBlankLines: text.split('\n').filter((line) => line.trim()).length,
    policyDecisionLocations,
    policyWiringLocations,
    handlers,
  }
}

function lineDiff(beforeText: string, afterText: string) {
  const before = beforeText.split('\n')
  const after = afterText.split('\n')
  const lengths = Array.from({ length: before.length + 1 }, () =>
    Array<number>(after.length + 1).fill(0),
  )

  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      lengths[left][right] = before[left] === after[right]
        ? lengths[left + 1][right + 1] + 1
        : Math.max(lengths[left + 1][right], lengths[left][right + 1])
    }
  }

  const unchanged = lengths[0][0]
  return { added: after.length - unchanged, removed: before.length - unchanged }
}

const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, 'manifest.json'), 'utf8'),
) as {
  actions: Record<string, string[]>
  sourceFiles: Record<string, string>
  sharedSourceFiles: Record<string, { before: string; after: string }>
}
const behavior = JSON.parse(
  await readFile(resolve(evidenceRoot, 'behavior-matrix.json'), 'utf8'),
) as {
  summary: { variants: number; cases: number; observations: number; equivalentCases: number }
  cases: Array<{
    action: string
    scenario: string
    observations: Array<{ trace: string[] }>
  }>
}

const variants = Object.fromEntries(
  await Promise.all(Object.entries(sources).map(async ([name, path]) => {
    const beforeText = await readFile(resolve(fixtureRoot, manifest.sourceFiles[name]), 'utf8')
    const afterText = await readFile(resolve(labRoot, path), 'utf8')
    const before = inspect(beforeText, `before/${name}.ts`)
    const after = inspect(afterText, path)
    const changedHandlers = Object.keys(after.handlers).filter(
      (handler) => before.handlers[handler] !== after.handlers[handler],
    )

    return [name, {
      source: { before: `fixtures/change-amplification/before/${manifest.sourceFiles[name]}`, after: path },
      filesChanged: Number(beforeText !== afterText),
      handlersChanged: changedHandlers,
      lines: lineDiff(beforeText, afterText),
      policyDecisionLocations: after.policyDecisionLocations,
      policyWiringLocations: after.policyWiringLocations,
      decisionPoints: { before: before.decisionPoints, after: after.decisionPoints },
      maxIfNesting: { before: before.maxIfNesting, after: after.maxIfNesting },
      nonBlankLines: { before: before.nonBlankLines, after: after.nonBlankLines },
    }]
  })),
)

const baselineCases = new Set(
  Object.entries(manifest.actions).flatMap(([action, scenarios]) =>
    scenarios.map((scenario) => `${action}:${scenario}`),
  ),
)
const currentCases = new Set(behavior.cases.map(({ action, scenario }) => `${action}:${scenario}`))
const sharedChanges = Object.fromEntries(
  await Promise.all(Object.entries(manifest.sharedSourceFiles).map(async ([name, paths]) => {
    const beforeText = await readFile(resolve(fixtureRoot, paths.before), 'utf8')
    const afterText = await readFile(resolve(labRoot, paths.after), 'utf8')
    return [name, {
      source: { before: `fixtures/change-amplification/before/${paths.before}`, after: paths.after },
      changed: beforeText !== afterText,
      lines: lineDiff(beforeText, afterText),
    }]
  })),
)

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  experiment: 'Add editorial-lock after online and before permission in publish, archive, and delete',
  protocol: 'change-amplification-protocol.md',
  behaviorValidation: {
    ...behavior.summary,
    previousCasesPreserved: [...baselineCases].filter((entry) => currentCases.has(entry)).length,
    previousCasesUpdated: behavior.cases.filter(
      ({ action, scenario, observations }) =>
        baselineCases.has(`${action}:${scenario}`) &&
        observations[0]?.trace.includes('check:editorial-lock'),
    ).length,
    newCases: [...currentCases].filter((entry) => !baselineCases.has(entry)),
  },
  methodology: 'Before sources and case manifest are versioned fixtures; after sources are parsed from the live benchmark. Line deltas use an LCS diff and handler changes compare AST source text.',
  sharedChanges,
  productionFilesChangedPerVariant:
    1 + Object.values(sharedChanges).filter((change) => change.changed).length,
  variants,
}

await writeFile(resolve(evidenceRoot, 'change-amplification.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(variants))
