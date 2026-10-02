import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const labRoot = resolve(here, '..')
const outputPath = resolve(labRoot, '../evidence/structural-metrics.json')
const files = {
  guardedConsumer: 'src/benchmark/guarded.ts',
  guardedInfrastructure: 'src/guards.ts',
  earlyReturn: 'src/benchmark/early-return.ts',
  monolithic: 'src/benchmark/monolithic.ts',
}

function measure(sourceText: string, path: string) {
  const source = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true)
  let ifStatements = 0
  let decisionPoints = 0
  let returnStatements = 0
  let maxIfNesting = 0
  let policyReferences = 0

  function visit(node: ts.Node, ifDepth = 0) {
    let childDepth = ifDepth

    if (ts.isIfStatement(node)) {
      ifStatements += 1
      decisionPoints += 1
      childDepth += 1
      maxIfNesting = Math.max(maxIfNesting, childDepth)
    }

    if (
      ts.isConditionalExpression(node) ||
      (ts.isBinaryExpression(node) &&
        [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(
          node.operatorToken.kind,
        ))
    ) {
      decisionPoints += 1
    }

    if (ts.isReturnStatement(node)) returnStatements += 1

    if (
      ts.isPropertyAccessExpression(node) &&
      ['isOnline', 'isEditorialLocked', 'canPerform', 'isContentValid', 'isConfirmed'].includes(node.name.text)
    ) {
      policyReferences += 1
    }

    ts.forEachChild(node, (child) => visit(child, childDepth))
  }

  visit(source)

  return {
    nonBlankLines: sourceText.split('\n').filter((line) => line.trim()).length,
    ifStatements,
    decisionPoints,
    maxIfNesting,
    returnStatements,
    policyReferences,
  }
}

const measurements = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([name, path]) => {
      const sourceText = await readFile(resolve(labRoot, path), 'utf8')
      return [name, { path, ...measure(sourceText, path) }]
    }),
  ),
)

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: {
    parser: `TypeScript ${ts.version}`,
    scope: 'Three behaviorally equivalent action handlers: publish, archive, and delete.',
    definitions: {
      nonBlankLines: 'Physical non-empty lines; descriptive only, not a quality or productivity score.',
      ifStatements: 'Count of IfStatement AST nodes.',
      decisionPoints: 'IfStatement, conditional expression, and logical AND/OR AST nodes.',
      maxIfNesting: 'Maximum nested IfStatement depth.',
      returnStatements: 'Count of ReturnStatement AST nodes.',
      policyReferences: 'References to the five domain policy dependencies; a proxy for policy wiring sites, not maintenance time.',
    },
  },
  measurements,
  guardedCombined: {
    note: 'Consumer and reusable infrastructure are reported separately and summed to avoid hiding abstraction cost.',
    nonBlankLines:
      measurements.guardedConsumer.nonBlankLines +
      measurements.guardedInfrastructure.nonBlankLines,
  },
}

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(measurements))
