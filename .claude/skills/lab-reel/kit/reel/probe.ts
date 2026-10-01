// Lab Reel · probe — reads geometry from the live lab page (same-origin iframe).
import { hull, type Rect, type State, type Story, type Target } from './core'

export interface TextLine extends Rect { text: string }

const keyOf = (s: State) => Object.keys(s).sort().map(k => `${k}=${s[k]}`).join('&')

export class Probe {
  private applied = ''
  constructor(readonly doc: Document, readonly story: Story) {}

  use(state: State) {
    const key = keyOf(state)
    if (key !== this.applied) { this.story.page.apply(this.doc, state); this.applied = key }
  }

  /**
   * Apply a state and wait until layout stops changing. The first visit to a state can
   * trigger async work (font subsets, deferred renders); later visits are synchronous.
   */
  async settle(state: State, timeout = 3000) {
    this.use(state)
    const v = this.doc.defaultView!, frame = () => new Promise(r => v.requestAnimationFrame(() => r(null)))
    const print = () => `${this.doc.body.getBoundingClientRect().height}|${this.doc.body.innerHTML.length}`
    const until = performance.now() + timeout
    let last = '', calm = 0
    while (calm < 3 && performance.now() < until) {
      await this.doc.fonts.ready; await frame()
      const now = print(); calm = now === last ? calm + 1 : 0; last = now
    }
  }

  private elements(sel: string) {
    return [...this.doc.querySelectorAll(sel)].filter(el => el.getClientRects().length > 0 && !el.closest('[hidden]'))
  }

  private box(el: Element): Rect {
    const r = el.getBoundingClientRect(), v = this.doc.defaultView!
    return { x: r.left + v.scrollX, y: r.top + v.scrollY, w: r.width, h: r.height }
  }

  /** Visual text lines of the matched elements, one rect per rendered line. */
  lines(target: Target): TextLine[] {
    const sel = typeof target === 'string' ? target : target.sel
    const filter = typeof target === 'string' ? undefined : target.line
    const out: TextLine[] = []
    for (const el of this.elements(sel)) out.push(...this.linesOf(el))
    const picked = filter ? out.filter(l => filter.test(l.text)) : out
    if (!picked.length) throw new Error(`sem linhas de texto visíveis em ${sel}${filter ? ` (${filter})` : ''}`)
    return picked
  }

  private linesOf(root: Element): TextLine[] {
    const v = this.doc.defaultView!, range = this.doc.createRange(), frags: TextLine[] = []
    const walk = this.doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      let offset = 0
      for (const segment of n.data.split('\n')) {
        const lead = segment.length - segment.trimStart().length, body = segment.trim()
        if (body) {
          range.setStart(n, offset + lead); range.setEnd(n, offset + lead + body.length)
          const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0)
          for (const r of rects) frags.push({ x: r.left + v.scrollX, y: r.top + v.scrollY, w: r.width, h: r.height, text: rects.length === 1 ? body : '' })
        }
        offset += segment.length + 1
      }
    }
    // join fragments that sit on the same rendered line
    const lines: TextLine[] = []
    for (const f of frags) {
      const prev = lines[lines.length - 1]
      if (prev && Math.abs(prev.y + prev.h / 2 - (f.y + f.h / 2)) < Math.min(prev.h, f.h) * 0.4 && f.x - (prev.x + prev.w) < f.h && f.x >= prev.x) {
        Object.assign(prev, hull([prev, f]), { text: [prev.text, f.text].filter(Boolean).join(' ') })
      } else lines.push({ ...f })
    }
    return lines
  }

  rect(targets: Target | Target[]): Rect {
    const list = Array.isArray(targets) ? targets : [targets]
    return hull(list.map(t => {
      if (typeof t !== 'string' && t.line) return hull(this.lines(t))
      const sel = typeof t === 'string' ? t : t.sel, els = this.elements(sel)
      if (!els.length) throw new Error(`seletor sem elemento visível: ${sel}`)
      return hull(els.map(el => this.box(el)))
    }))
  }

  /** Every visible text line of the page — used to detect marks placed over text. */
  allText(): TextLine[] {
    return this.linesOf(this.doc.body)
  }

  height() { return this.doc.body.getBoundingClientRect().height }
}
