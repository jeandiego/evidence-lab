import metrics from '../../../evidence/metrics.json'
import perf from '../../../evidence/react-performance.json'
import { defineStory, facts, lit, say, sum } from './core'

const fact = facts({ metrics, perf })
const loc = (group: string) => fact(`metrics:groups.${group}.total`)
const run = (strategy: string, metric: string, o: { dec?: number; unit?: string } = {}) => fact(`perf:summary.${strategy}.${metric}`, o)

const consumer = loc('reactAbstractedConsumer'), infra = loc('reactAbstractedInfrastructure'), schema = loc('validationSchema')
const rhf = loc('reactRHFZodConsumer'), vue = loc('vueConsumerAndValidation'), angular = loc('angularConsumerAndValidation')
const renders = (s: string) => run(s, 'renderFunctionCalls.median')
const cpu = (s: string) => run(s, 'taskDurationMs.median', { dec: 1, unit: 'ms' })
const gzip = (s: string) => run(s, 'bundle.totalGzipBytes', { unit: 'B' })
const samples = fact('perf:methodology.samples')
const perfSource = say`evidence/react-performance.json · mediana de ${samples} execuções · CPU não é INP`
const facts6 = (i: number) => `#strategy-facts > div:nth-child(${i})`

export const story = defineStory({
  id: '002',
  brand: 'Synko Lab · 002',
  address: 'lab.synko.digital',
  page: {
    src: '/index.html',
    width: 1440,
    base: { strategy: 'react-abstracted', inspection: 'code' },
    apply(doc, state) {
      doc.querySelector<HTMLElement>(`[data-strategy="${state.strategy}"]`)?.click()
      doc.querySelector<HTMLElement>(`[data-inspection="${state.inspection}"]`)?.click()
    },
  },

  cover: {
    id: 'capa',
    eyebrow: 'Formulários · DX',
    claim: 'Quanto custa dar aos formulários React uma API declarativa?',
    sub: 'O mesmo formulário em seis estratégias: React, Vue e AngularJS.',
    frame: '.hero', pad: 40,
    marks: [{ kind: 'highlight', target: '.hero h1 em' }],
  },

  shots: [
    {
      id: 'consumidor',
      eyebrow: 'Superfície do consumidor',
      claim: say`Com a abstração local, o call site do formulário tem ${consumer} linhas.`,
      sub: 'Registro, estado e erro ficam atrás de Field.*, tipado pelo schema.',
      source: 'evidence/metrics.json · reactAbstractedConsumer',
      frame: '.inspection', pad: [16, 32, 32, 32], focus: '.code-window',
      readouts: [{ kind: 'count', caption: 'linhas no call site · App.tsx', fact: consumer }],
      marks: [
        { kind: 'highlight', target: { sel: '.code-window pre', line: /^<Field/ } },
        { kind: 'tag', target: { sel: '.code-window pre', line: /^<Field/ }, side: 'right', tone: 'spark', text: 'Field.* tipado' },
      ],
    },
    {
      id: 'custo',
      eyebrow: 'O custo mudou de endereço',
      claim: say`O primeiro formulário abstraído custa ${sum(consumer, infra, schema)} linhas. Com RHF + Zod direto, ${sum(rhf, schema)}.`,
      sub: say`Depois, cada tela nova custa ${consumer} linhas contra ${rhf}.`,
      source: 'Linhas localizam o custo; não medem produtividade.',
      frame: '.strategy-summary', pad: [24, 32, 24, 240], focus: facts6(6),
      readouts: [{
        kind: 'bars',
        rows: [
          { label: 'Abstração', parts: [{ label: 'consumidor', fact: consumer }, { label: 'infraestrutura', fact: infra }, { label: 'schema', fact: schema }] },
          { label: 'RHF + Zod', parts: [{ label: 'consumidor', fact: rhf }, { label: 'schema', fact: schema }] },
        ],
      }],
      marks: [
        { kind: 'highlight', target: `${facts6(6)} dd` },
        { kind: 'tag', target: facts6(6), side: 'left', text: 'por camada' },
      ],
    },
    {
      id: 'binding',
      eyebrow: 'Mesma API, outro binding',
      claim: 'Mesma API pública. Só o binding interno muda.',
      sub: 'useController assina cada campo; register deixa o valor no DOM.',
      source: perfSource,
      frame: ['.stage__header', '.stage__preview'], pad: 24, focus: '#strategy-facts',
      swap: { strategy: 'react-uncontrolled' },
      poster: true,
      readouts: [
        { kind: 'shift', caption: 'renders no cenário', from: renders('react-abstracted'), to: renders('react-uncontrolled') },
        { kind: 'shift', caption: 'CPU mediana', from: cpu('react-abstracted'), to: cpu('react-uncontrolled') },
      ],
      marks: [
        { kind: 'highlight', target: `${facts6(3)} dd` },
        { kind: 'highlight', target: `${facts6(4)} dd` },
        { kind: 'bracket', targets: [facts6(2), facts6(4)], side: 'left', text: 'binding' },
      ],
    },
    {
      id: 'bundle',
      eyebrow: 'Bundle menor, CPU maior',
      claim: 'Sem biblioteca de formulário, o bundle encolhe e a CPU cresce.',
      sub: say`Cada alteração renderiza o App inteiro: ${renders('react-state')} renders no cenário.`,
      source: perfSource,
      frame: ['.stage__header', '.stage__preview'], pad: 24, focus: '#strategy-facts',
      swap: { strategy: 'react-state' },
      readouts: [
        { kind: 'shift', caption: 'bundle gzip', from: gzip('react-uncontrolled'), to: gzip('react-state') },
        { kind: 'shift', caption: 'CPU mediana', from: cpu('react-uncontrolled'), to: cpu('react-state') },
      ],
      marks: [
        { kind: 'highlight', target: `${facts6(4)} dd` },
        { kind: 'highlight', target: `${facts6(5)} dd` },
        { kind: 'bracket', targets: [facts6(3), facts6(5)], side: 'left', text: 'trade-off' },
      ],
    },
    {
      id: 'nucleo',
      eyebrow: 'O núcleo decide parte',
      claim: 'Vue resolve o binding com v-model. AngularJS traz também a validação.',
      sub: 'A comparação mostra onde cada decisão fica.',
      source: 'AngularJS está descontinuado; aparece como referência histórica.',
      frame: '.frameworks__comparison', pad: [40, 32, 110, 32], focus: '.frameworks__comparison',
      readouts: [
        { kind: 'count', caption: 'Vue · consumidor + validação', fact: vue },
        { kind: 'count', caption: 'AngularJS · consumidor + validação', fact: angular },
      ],
      marks: [
        { kind: 'highlight', target: '.frameworks__comparison article:nth-child(1) dl > div:nth-child(2) dd' },
        { kind: 'highlight', target: '.frameworks__comparison article:nth-child(2) dl > div:nth-child(2) dd' },
        { kind: 'tag', target: '.frameworks__comparison article:nth-child(1) dl > div:nth-child(2) dd', side: 'bottom', text: 'validação na aplicação' },
        { kind: 'tag', target: '.frameworks__comparison article:nth-child(2) dl > div:nth-child(2) dd', side: 'bottom', text: 'validação no framework' },
      ],
    },
  ],

  closing: {
    id: 'fecho',
    eyebrow: 'Leitura',
    claim: 'A API fica menor. A infraestrutura fica sob responsabilidade do time.',
    sub: 'Ela decide quem precisa conhecê-la, quantas vezes e em qual lugar.',
    source: say`Artigo, código e dados brutos: lab.synko.digital/pt-br/${lit('002')}-form-abstractions-dx`,
    frame: '.page-footer p', pad: [70, 40, 70, 40],
    marks: [{ kind: 'highlight', target: '.page-footer p' }],
  },
})
