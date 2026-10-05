import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.dirname(new URL(import.meta.url).pathname)
const privateReportDir = path.resolve(reportDir, '../.private-reports')
const classifier = JSON.parse(fs.readFileSync(path.join(privateReportDir, 'state-ownership-classifier-pass.json'), 'utf8'))
const judge = JSON.parse(fs.readFileSync(path.join(privateReportDir, 'state-ownership-judge-pass.json'), 'utf8'))

const aliases = {
  'draft-query-hydration': 'draft-fetch',
  'draft-save-reconciliation': 'draft-save',
  'draft-add-transactions-reconciliation': 'draft-add-transaction',
  'draft-remove-transactions-reconstruction': 'draft-remove-transactions',
  'draft-remove-home-collect-optimistic': 'draft-remove-home-collect',
  'patient-config-query-hydration': 'patient-config-fetch',
  'patient-config-update-from-input': 'patient-config-update',
  'viewer-query-hydration': 'viewer-fetch',
  'patient-health-update-from-input': 'viewer-change-health-data',
  'cart-add-product-partial-merge': 'cart-add-product',
  'cart-remove-product-fanout': 'cart-remove-product',
  'coupon-post-save-cart-overwrite': 'coupon-change-to-particular-and-apply-campaign',
  'subscription-removal-atomic-rebuild': 'subscription-card-remove-subscription',
  'reserve-status-to-local-reconstruction': 'reserve-effective',
  'health-insurance-status-hydration': 'health-insurance-remote-validation',
  'payment-method-workflow-state': 'payment-method-change',
  'clone-draft-patient-switch': 'clone-draft-to-new-patient',
  'authorization-query-hydration': 'unit-previous-authorization',
  'unavailable-product-removal-fanout': 'unit-remove-unavailable-products',
  'unit-selection-owned-state': 'unit-reconstruct-from-draft'
}

const labels = { evitavel: 'avoidable', simplificavel: 'simplifiable', legitimo: 'legitimate', inconclusivo: 'inconclusive' }
const extensionIds = new Set([
  'coupon-change-to-particular-and-apply-campaign',
  'subscription-card-remove-subscription',
  'health-insurance-remote-validation',
  'payment-method-change',
  'clone-draft-to-new-patient',
  'unit-previous-authorization',
  'unit-remove-unavailable-products'
])
const judgeById = new Map(judge.decisions.map(item => [item.id, item]))
const matchedJudgeIds = new Set()

const dedupeEvidence = evidence => [...new Map(evidence.map(item => [`${item.path}:${item.line}`, item])).values()]

function adjudicate(initial, reviewed) {
  if (!initial) return { classification: reviewed, rule: 'judge-only item retained; classifier did not independently discover it' }
  if (initial === reviewed) return { classification: initial, rule: 'classifier and judge agreed' }
  if (new Set([initial, reviewed]).size === 2 && [initial, reviewed].every(value => ['avoidable', 'simplifiable'].includes(value))) {
    return { classification: 'simplifiable', rule: 'avoidable/simplifiable disagreement resolved to the less absolute claim' }
  }
  return { classification: 'inconclusive', rule: 'ownership-boundary disagreement escalated to inconclusive' }
}

const results = classifier.items.map(item => {
  const judgeId = aliases[item.id]
  const reviewed = judgeById.get(judgeId)
  if (!reviewed) throw new Error(`Missing judge decision for ${item.id} (${judgeId})`)
  matchedJudgeIds.add(judgeId)
  const reviewedClassification = labels[reviewed.classification]
  const final = adjudicate(item.classification, reviewedClassification)
  return {
    id: item.id,
    entity: item.entity,
    operation: item.operation,
    canonicalOwner: item.canonicalOwner,
    duplicatedRepresentations: item.duplicatedRepresentations,
    evidence: dedupeEvidence([...item.evidence, ...reviewed.evidence]),
    classifier: {
      discoveredIndependently: true,
      classification: item.classification,
      confidence: item.confidence,
      rationale: item.reason,
      counterargument: item.counterargument
    },
    judge: {
      discoveryMode: extensionIds.has(judgeId) ? 'targeted_extension_without_initial_label' : 'independent_initial_pass',
      classification: reviewedClassification,
      confidence: reviewed.confidence,
      rationale: reviewed.rationale,
      counterargument: reviewed.counterargument,
      responseToCounterargument: reviewed.judgeResponse
    },
    judgeResult: item.classification === reviewedClassification ? 'approved' : 'reclassified_or_escalated',
    finalClassification: final.classification,
    adjudication: final.rule
  }
})

const judgeOnlyEntities = {
  'reserve-cancel': 'reservation code on draft products',
  'draft-effectivation-result': 'scheduling completion result',
  'coupon-operation-ui-state': 'coupon interaction UI state'
}

for (const reviewed of judge.decisions) {
  if (matchedJudgeIds.has(reviewed.id)) continue
  const reviewedClassification = labels[reviewed.classification]
  const final = adjudicate(null, reviewedClassification)
  results.push({
    id: reviewed.id,
    entity: judgeOnlyEntities[reviewed.id] ?? reviewed.id,
    operation: reviewed.operation,
    canonicalOwner: reviewedClassification === 'legitimate' ? 'client workflow' : 'server or mixed',
    duplicatedRepresentations: [],
    evidence: reviewed.evidence,
    classifier: {
      discoveredIndependently: false,
      classification: null,
      confidence: null,
      rationale: 'Not discovered in the classifier pass.',
      counterargument: null
    },
    judge: {
      discoveryMode: 'independent_initial_pass',
      classification: reviewedClassification,
      confidence: reviewed.confidence,
      rationale: reviewed.rationale,
      counterargument: reviewed.counterargument,
      responseToCounterargument: reviewed.judgeResponse
    },
    judgeResult: 'classifier_did_not_discover',
    finalClassification: final.classification,
    adjudication: final.rule
  })
}

const countBy = (items, selector) => items.reduce((acc, item) => {
  const key = selector(item) ?? 'not_discovered'
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {})

const shared = results.filter(item => item.classifier.discoveredIndependently)
const agreements = shared.filter(item => item.classifier.classification === item.judge.classification).length
const disagreements = shared.length - agreements
const final = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  repositoryAlias: 'real-production-scheduling-app',
  anonymization: {
    absoluteSourcePathIncluded: false,
    organizationNameIncluded: false,
    note: 'Relative source paths are retained for auditability. Existing domain identifiers in filenames are not renamed.'
  },
  scope: {
    objective: 'Classify concrete manual reconciliation operations between remote data and a global Zustand store.',
    unitOfCount: 'One user/domain operation, deduplicated even when it performs multiple writes.',
    excluded: ['pure UI setters without a remote operation', 'test setup', 'read-only store access', 'analytics-only reads'],
    interpretation: 'Counts measure maintenance/reconciliation sites, not confirmed production defects.'
  },
  process: {
    classifierPass: 'Independent repository inspection and classification.',
    judgePass: 'Independent initial discovery followed by a label-blind targeted coverage extension for classifier-only operations.',
    adjudicationPolicy: [
      'Agreement retains the shared label.',
      'Avoidable versus simplifiable resolves to simplifiable.',
      'Disagreement crossing an ownership boundary resolves to inconclusive.',
      'Judge-only discoveries retain the judge label and are reported as classifier misses.'
    ]
  },
  metrics: {
    uniqueOperations: results.length,
    classifierDiscovered: shared.length,
    judgeReviewed: results.length,
    judgeIndependentInitialDiscoveries: results.filter(item => item.judge.discoveryMode === 'independent_initial_pass').length,
    judgeTargetedExtensionReviews: results.filter(item => item.judge.discoveryMode === 'targeted_extension_without_initial_label').length,
    sharedOperations: shared.length,
    agreements,
    disagreements,
    agreementRateOnShared: Number((agreements / shared.length).toFixed(4)),
    classifierCounts: countBy(results, item => item.classifier.classification),
    judgeCounts: countBy(results, item => item.judge.classification),
    finalCounts: countBy(results, item => item.finalClassification)
  },
  results,
  crossCuttingFindings: judge.crossCuttingFindings,
  limitations: [
    ...judge.limitations,
    'Static inspection cannot prove runtime frequency, user impact, or that a reconciliation site has produced a defect.',
    'Avoidable means avoidable under an explicit server-state ownership architecture; removing a write from the current architecture would not be safe by itself.',
    'The targeted judge extension was label-blind but not discovery-independent, so agreement metrics include only shared classifier items and explicitly disclose review mode.',
    'The inventory is evidence-backed but not guaranteed exhaustive across every legacy path in the repository.'
  ]
}

fs.mkdirSync(privateReportDir, { recursive: true })
fs.writeFileSync(path.join(privateReportDir, 'state-ownership-classification.json'), `${JSON.stringify(final, null, 2)}\n`)
