import assert from 'node:assert/strict'
import test from 'node:test'

import { audit, transform } from './protect-report-paths.mjs'

const key = Buffer.from('0123456789abcdef'.repeat(4), 'hex')
const report = {
  evidence: [
    { path: 'src/modules/example/example.service.ts', line: 49 },
    { path: 'src/state/example.ts', line: 176, detail: 'setExample writes to exampleStore.value.' },
    { path: 'src/modules/example/example.service.ts', line: 45 }
  ]
}

test('protects every path recursively and can reveal it again', () => {
  const protectedReport = transform(report, 'protect', key)
  assert.match(protectedReport.evidence[0].path, /^protected-path:v1:/)
  assert.notEqual(protectedReport.evidence[0].path, report.evidence[0].path)
  assert.deepEqual(transform(protectedReport, 'reveal', key), report)
})

test('does not encrypt an already protected path twice', () => {
  const once = transform(report, 'protect', key)
  assert.deepEqual(transform(once, 'protect', key), once)
})

test('authentication fails with a different key', () => {
  const protectedReport = transform(report, 'protect', key)
  const otherKey = Buffer.from('fedcba9876543210'.repeat(4), 'hex')
  assert.throws(() => transform(protectedReport, 'reveal', otherKey))
})

test('audit rejects clear paths and flags source-like prose separately', () => {
  const findings = audit(report)
  assert.equal(findings.filter(item => item.severity === 'error').length, 3)
  assert.equal(findings.filter(item => item.severity === 'review').length, 1)
})
