// Reel do post 003 — roteiro derivado de post/reel-brief.md (Anatomia + Execução com Confirmação negada).
import { defineStory, lit, say } from './core'
import { check, click, el, input, until } from './drive'

type View = 'anatomy' | 'execution'
const FINAL_TONES = ['blocked', 'success', 'error']
const step = (n: number) => `.pipeline-step:nth-child(${n})`

export const story = defineStory({
  id: '003',
  brand: 'Synko Lab · 003',
  address: 'lab.synko.digital',
  duration: 30,
  page: {
    src: './index.html',
    width: 1440,
    base: { view: 'anatomy', stage: '0', confirmation: 'on', run: 'no' },
    // briefing, "Não mostrar": controles da demo e as abas Código e Evidências
    conceal: ['.workbench .controls', '#tab-code', '#tab-evidence'],
    async apply(doc, state) {
      click(doc, `#tab-${state.view as View}`)
      if (state.view === 'anatomy') {
        // the range input pauses the autoplay; move it off and back so React sees a change
        const target = Number(state.stage)
        input(doc, '#anatomy-range', String(target === 0 ? 1 : 0))
        input(doc, '#anatomy-range', String(target))
        await until(doc, () => el(doc, '.anatomy-controls label').textContent!.includes(`Etapa ${target + 1}`), 'etapa da anatomia')
        return
      }
      // execution: start from a clean trace, set the toggles, optionally run until a final outcome
      const reset = el<HTMLButtonElement>(doc, '.actions .secondary')
      if (!reset.disabled) reset.click()
      await until(doc, () => !doc.querySelector('.trace li'), 'trace vazio')
      check(doc, '.toggles .toggle-row:nth-child(1) input', true)
      check(doc, '.toggles .toggle-row:nth-child(2) input', true)
      check(doc, '.toggles .toggle-row:nth-child(3) input', state.confirmation === 'on')
      check(doc, '.toggles .toggle-row:nth-child(4) input', true)
      await until(doc, () => el(doc, '.outcome').dataset.tone === 'idle', 'pipeline pronta')
      if (state.run === 'yes') {
        click(doc, '.actions .primary')
        await until(doc, () => FINAL_TONES.includes(el(doc, '.outcome').dataset.tone ?? ''), 'fim da execução')
      }
    },
  },

  cover: {
    id: 'capa',
    eyebrow: 'Guards para handlers',
    claim: 'Quando uma pré-condição vira arquitetura?',
    sub: 'O mesmo fluxo com guards, early return e código monolítico.',
    frame: ['.intro h1', '.intro p'], pad: 40,
  },

  shots: [
    {
      id: 'anatomia',
      eyebrow: 'Um handler que sabe demais',
      claim: 'Um handler, cinco responsabilidades: políticas, workflow e ação no mesmo bloco.',
      source: 'Caso real sanitizado · docs/sanitized-real-world-case.md',
      frame: '.anatomy-code-window', pad: 24, focus: '.anatomy-code-window',
      marks: [
        { kind: 'highlight', target: '.anatomy-line[data-concern="offer"] .line-code' },
        { kind: 'highlight', target: '.anatomy-line[data-concern="availability"] .line-code' },
        { kind: 'tag', target: { sel: '.anatomy-line[data-concern="offer"] .line-code', line: /\S/ }, side: 'right', tone: 'spark', text: 'confirmação' },
        { kind: 'tag', target: { sel: '.anatomy-line[data-concern="availability"] .line-code', line: /\S/ }, side: 'right', tone: 'spark', text: 'disponibilidade' },
      ],
    },
    {
      id: 'execucao',
      eyebrow: 'A cadeia para no bloqueio',
      claim: 'Confirmação negada: a cadeia para antes da ação.',
      sub: 'Conectividade e permissão passam; publishArticle() nunca roda.',
      source: 'Demo do lab · Confirmação desligada',
      state: { view: 'execution' },
      swap: { confirmation: 'off', run: 'yes' },
      poster: true,
      frame: '.workbench .stage', pad: 24, focus: '.pipeline',
      marks: [
        { kind: 'highlight', target: `${step(3)} .node-status`, when: 'after' },
        { kind: 'highlight', target: '.trace li:last-child', when: 'after' },
        { kind: 'tag', target: step(4), side: 'bottom', text: 'ação fica de fora', when: 'after' },
      ],
    },
  ],

  closing: {
    id: 'fecho',
    eyebrow: 'Leitura',
    claim: 'Para uma condição local, um if continua mais simples.',
    sub: 'Quando a mesma pré-condição se repete, um guard centraliza o bloqueio e explicita a ordem.',
    source: say`Artigo, código e dados: lab.synko.digital/pt-br/${lit('003')}-guarded-handlers`,
    frame: '.contract', pad: [60, 40, 60, 40], zoom: 2.6,
    marks: [{ kind: 'highlight', target: '.contract' }],
  },
})
