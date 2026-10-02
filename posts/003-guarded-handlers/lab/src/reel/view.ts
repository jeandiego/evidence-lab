// Lab Reel · view — canvas layout, Synko visual language and per-frame painting.
import { beat, copyHtml, curve, factText, format, mix, type Readout, type Rect, type Shot, type Story } from './core'

export const CANVAS = { w: 1080, h: 1350 }
export const SPECIMEN = { x: 48, y: 624, w: 984, h: 634 }
export const TOKENS = { canvas: '#F5F3F1', paper: '#FDFCFC', stone: '#EBE8E4', ink: '#1E1B18', quiet: '#514C47', muted: '#777169', wine: '#421D24', wineSoft: '#6F2F3A', spark: '#D48A46' }
const SANS = '"Figtree Variable", ui-sans-serif, system-ui, sans-serif'
const MONO = '"Geist Mono Variable", ui-monospace, Menlo, monospace'
const T = TOKENS

const STYLE = `
.rl{position:relative;width:${CANVAS.w}px;height:${CANVAS.h}px;overflow:hidden;background:${T.canvas};color:${T.ink};font-family:${SANS};-webkit-font-smoothing:antialiased}
.rl-all{position:absolute;inset:0}
.rl-head{position:absolute;left:48px;right:48px;top:48px;height:28px;display:flex;align-items:center;gap:18px;font:600 17px/1 ${MONO};letter-spacing:.08em;text-transform:uppercase}
.rl-brand{color:${T.wine}}.rl-brand b{color:${T.spark};font-weight:600;margin:0 .4em}
.rl-rail{margin-left:auto;display:flex;gap:6px}.rl-rail i{position:relative;width:34px;height:4px;border-radius:2px;background:${T.stone};overflow:hidden}
.rl-rail i::after{content:"";position:absolute;inset:0;background:${T.spark};transform:scaleX(var(--k,0));transform-origin:left}
.rl-count{min-width:62px;text-align:right;color:${T.muted};font-variant-numeric:tabular-nums}
.rl-slot{position:absolute;inset:0;pointer-events:none;will-change:opacity,transform}
.rl-slot>*{position:absolute;left:48px;right:48px;margin:0}
.rl-eyebrow{top:112px;font:600 17px/20px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:${T.wine}}
.rl-claim{top:146px;font-weight:300;font-size:54px;line-height:60px;letter-spacing:-.03em;text-wrap:balance}
.rl-sub{font-weight:400;font-size:26px;line-height:34px;color:${T.quiet};letter-spacing:-.005em}
.rl-fact{color:${T.wine};font-weight:420;font-variant-numeric:tabular-nums}
.rl-readouts{top:436px;height:164px;display:flex;gap:24px}
.rl-ro{flex:1;min-width:0;border-top:1px solid ${T.ink};padding-top:14px}
.rl-cap{display:block;font:600 15px/18px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:${T.muted}}
.rl-val{display:flex;align-items:baseline;gap:10px;margin-top:6px;white-space:nowrap}
.rl-num{font-weight:300;font-size:84px;line-height:92px;letter-spacing:-.035em;font-variant-numeric:tabular-nums}
.rl-unit{font-size:30px;font-weight:350;color:${T.quiet}}
.rl-meta{display:flex;align-items:center;gap:12px;height:30px;font:500 16px/1 ${MONO};color:${T.muted}}
.rl-delta{padding:6px 10px;border-radius:999px;background:${T.spark};color:${T.ink};font-weight:650}
.rl-bars{flex:1;display:flex;flex-direction:column;gap:12px;border-top:1px solid ${T.ink};padding-top:16px}
.rl-row{display:grid;grid-template-columns:190px minmax(0,1fr) 84px;align-items:center;gap:16px;height:40px}
.rl-row>span{font:600 15px/1 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${T.muted}}
.rl-row>strong{font-weight:300;font-size:40px;letter-spacing:-.03em;text-align:right;font-variant-numeric:tabular-nums}
.rl-track{position:relative;height:28px;border-radius:6px;background:${T.stone};display:flex;overflow:hidden}
.rl-seg{height:100%;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;box-sizing:border-box;font:600 15px/1 ${MONO};color:${T.paper};white-space:nowrap;overflow:hidden}
.rl-legend{display:flex;gap:22px;font:600 14px/1 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${T.muted}}
.rl-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;vertical-align:-1px}
.rl-source{top:1282px;right:300px !important;font:500 15px/20px ${MONO};color:${T.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rl-address{position:absolute;right:48px;top:1282px;font:600 15px/20px ${MONO};color:${T.wine};letter-spacing:.02em}
.rl-specimen{position:absolute;left:${SPECIMEN.x}px;top:${SPECIMEN.y}px;width:${SPECIMEN.w}px;height:${SPECIMEN.h}px;overflow:hidden;border-radius:14px;background:${T.paper};box-shadow:inset 0 0 0 1px ${T.stone}}
.rl-cam{position:absolute;left:0;top:0;transform-origin:0 0}
.rl-cam iframe{display:block;border:0;background:${T.paper};pointer-events:none}
.rl-ink{position:absolute;inset:0;overflow:visible}
.rl-pills{position:absolute;inset:0}
.rl-pill{position:absolute;left:0;top:0;height:34px;padding:0 14px;border-radius:17px;display:flex;align-items:center;font:600 16px/1 ${MONO};letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;background:${T.wine};color:${T.paper}}
.rl-pill[data-tone=spark]{background:${T.spark};color:${T.ink}}
.rl-pill .rl-fact{color:inherit}
.rl-shutter{position:absolute;inset:0;background:${T.paper};opacity:0}
.rl-frame-edge{position:absolute;inset:0;border-radius:14px;box-shadow:inset 0 0 0 1px ${T.stone};pointer-events:none}
.rl-errors{position:absolute;left:0;right:0;bottom:0;max-height:40%;overflow:auto;margin:0;padding:14px 18px;background:#A33B2F;color:#fff;font:14px/1.45 ${MONO};white-space:pre-wrap;z-index:5}
`

export interface Refs {
  root: HTMLElement; all: HTMLElement; iframe: HTMLIFrameElement; cam: HTMLElement; ink: SVGSVGElement; pills: HTMLElement; shutter: HTMLElement
  slots: HTMLElement[]; rail: HTMLElement[]; count: HTMLElement
}

export function build(host: HTMLElement, story: Story): Refs {
  const style = document.createElement('style'); style.textContent = STYLE; document.head.append(style)
  host.className = 'rl'
  const [brand, ...rest] = story.brand.split('·').map(s => s.trim())
  host.innerHTML = `<div class="rl-all">
  <header class="rl-head"><span class="rl-brand">${brand}${rest.length ? `<b>·</b>${rest.join(' · ')}` : ''}</span><span class="rl-rail">${story.shots.map(() => '<i></i>').join('')}</span><span class="rl-count"></span></header>
  <section class="rl-slot"></section><section class="rl-slot"></section>
  <div class="rl-specimen"><div class="rl-cam"><iframe title="lab" scrolling="no" width="${story.page.width}" height="4200"></iframe></div>
    <svg class="rl-ink" width="${SPECIMEN.w}" height="${SPECIMEN.h}" viewBox="0 0 ${SPECIMEN.w} ${SPECIMEN.h}"></svg><div class="rl-pills"></div><div class="rl-shutter"></div><div class="rl-frame-edge"></div></div>
  <span class="rl-address">${story.address}</span></div>`
  const q = <E extends Element>(s: string) => host.querySelector(s) as E
  // a story without readouts gives their band to the specimen
  if (![story.cover, ...story.shots, story.closing].some(s => s?.readouts?.length)) {
    SPECIMEN.y = 436; SPECIMEN.h = 822
    const spec = q<HTMLElement>('.rl-specimen'), ink = q<SVGSVGElement>('.rl-ink')
    spec.style.top = `${SPECIMEN.y}px`; spec.style.height = `${SPECIMEN.h}px`
    ink.setAttribute('height', String(SPECIMEN.h)); ink.setAttribute('viewBox', `0 0 ${SPECIMEN.w} ${SPECIMEN.h}`)
  }
  return {
    root: host, all: q('.rl-all'), iframe: q('iframe'), cam: q('.rl-cam'), ink: q('.rl-ink'), pills: q('.rl-pills'), shutter: q('.rl-shutter'),
    slots: [...host.querySelectorAll<HTMLElement>('.rl-slot')], rail: [...host.querySelectorAll<HTMLElement>('.rl-rail i')], count: q('.rl-count'),
  }
}

// ---------- slot (text + readouts) ----------
const BAR_TONES = [T.wine, T.wineSoft, T.spark]
const delta = (from: number, to: number) => { const p = ((to - from) / from) * 100; return `${p < 0 ? '−' : '+'}${format(Math.abs(p), 0)}%` }

function readoutHtml(r: Readout) {
  if (r.kind === 'bars') {
    // a segment's colour follows its label, so rows with different parts share one legend
    const names = [...new Set(r.rows.flatMap(row => row.parts.map(p => p.label)))]
    const tone = (label: string) => BAR_TONES[names.indexOf(label) % BAR_TONES.length]
    const legend = names.map(n => `<span><i style="background:${tone(n)}"></i>${n}</span>`).join('')
    return `<div class="rl-bars">${r.rows.map(row => `<div class="rl-row"><span>${row.label}</span><div class="rl-track">${row.parts.map(p => `<i class="rl-seg" style="background:${tone(p.label)}">${format(p.fact.value, p.fact.dec)}</i>`).join('')}</div><strong>${format(row.parts.reduce((a, p) => a + p.fact.value, 0), 0)}</strong></div>`).join('')}<div class="rl-legend">${legend}</div></div>`
  }
  const f = r.kind === 'count' ? r.fact : r.to
  const meta = r.kind === 'shift' ? `<div class="rl-meta"><span class="rl-was">antes ${factText(r.from)}</span><span class="rl-delta">${delta(r.from.value, r.to.value)}</span></div>` : ''
  return `<div class="rl-ro"><span class="rl-cap">${r.caption}</span><div class="rl-val"><span class="rl-num"></span>${f.unit ? `<span class="rl-unit">${f.unit}</span>` : ''}</div>${meta}</div>`
}

export function fill(slot: HTMLElement, shot: Shot) {
  slot.innerHTML = `${shot.eyebrow ? `<p class="rl-eyebrow">${shot.eyebrow}</p>` : ''}<h1 class="rl-claim">${copyHtml(shot.claim)}</h1>${shot.sub ? `<p class="rl-sub">${copyHtml(shot.sub)}</p>` : ''}${shot.readouts?.length ? `<div class="rl-readouts">${shot.readouts.map(readoutHtml).join('')}</div>` : ''}${shot.source ? `<p class="rl-source">${copyHtml(shot.source)}</p>` : ''}`
  const claim = slot.querySelector<HTMLElement>('.rl-claim')!, sub = slot.querySelector<HTMLElement>('.rl-sub')
  if (sub) sub.style.top = `${146 + claim.offsetHeight + 14}px`
}

/** l: local time; swapAt: when the page changes state (shift readouts count then). */
export function paintSlot(slot: HTMLElement, shot: Shot, l: number, swapAt: number | null) {
  const parts = [slot.querySelector('.rl-eyebrow'), slot.querySelector('.rl-claim'), slot.querySelector('.rl-sub'), slot.querySelector('.rl-readouts'), slot.querySelector('.rl-source')]
  const delays = [0, 0, 0.12, 0.24, 0.36]
  parts.forEach((el, i) => {
    if (!el) return
    const k = beat(l, 0.42 + delays[i], 0.6, curve.rise)
    ;(el as HTMLElement).style.opacity = String(k); (el as HTMLElement).style.transform = `translateY(${(1 - k) * 18}px)`
  })
  const nums = slot.querySelectorAll<HTMLElement>('.rl-num'), metas = slot.querySelectorAll<HTMLElement>('.rl-delta')
  let ni = 0, mi = 0
  for (const r of shot.readouts ?? []) {
    if (r.kind === 'count') { nums[ni++].textContent = format(r.fact.value * beat(l, 1.6, 1.2, curve.rise), r.fact.dec) }
    else if (r.kind === 'shift') {
      const at = swapAt ?? 1.6, k = beat(l, at, 1.0, curve.rise)
      nums[ni++].textContent = format(mix(r.from.value, r.to.value, k), r.to.dec)
      metas[mi++].style.opacity = String(beat(l, at + 0.7, 0.4, curve.rise))
    } else {
      const max = Math.max(...r.rows.map(row => row.parts.reduce((a, p) => a + p.fact.value, 0)))
      const rows = slot.querySelectorAll<HTMLElement>('.rl-row')
      r.rows.forEach((row, ri) => {
        const k = beat(l, 1.6 + ri * 0.15, 1.0, curve.rise), segs = rows[ri].querySelectorAll<HTMLElement>('.rl-seg')
        row.parts.forEach((p, pi) => { segs[pi].style.width = `${(p.fact.value / max) * 100 * k}%` })
      })
    }
  }
}

export function placeSlot(slot: HTMLElement, opacity: number, lift: number) {
  slot.style.opacity = String(opacity); slot.style.transform = `translateY(${lift}px)`; slot.style.visibility = opacity < 0.001 ? 'hidden' : 'visible'
}

// ---------- specimen ink ----------
export type Placed =
  | { kind: 'highlight'; lines: Rect[]; k: number }
  | { kind: 'tag'; anchor: Rect; side: 'top' | 'right' | 'bottom' | 'left'; k: number; pill: HTMLElement }
  | { kind: 'bracket'; span: Rect; side: 'left' | 'right'; k: number; pill: HTMLElement }

export function pillHtml(html: string, tone: 'wine' | 'spark' = 'wine') {
  const el = document.createElement('div'); el.className = 'rl-pill'; el.dataset.tone = tone; el.innerHTML = html; return el
}

/** Pill box in specimen coords for a mark, given its projected anchor. */
export function pillBox(kind: 'tag' | 'bracket', anchor: Rect, side: string, w: number): Rect & { ax: number; ay: number; bx: number; by: number } {
  const h = 34, gap = kind === 'tag' ? 30 : 46, cy = anchor.y + anchor.h / 2
  if (side === 'right') { const x = anchor.x + anchor.w + gap; return { x, y: cy - h / 2, w, h, ax: anchor.x + anchor.w, ay: cy, bx: x, by: cy } }
  if (side === 'left') { const x = anchor.x - gap - w; return { x, y: cy - h / 2, w, h, ax: anchor.x, ay: cy, bx: x + w, by: cy } }
  // top/bottom: the wire leaves from the anchor's centre, 3px off its edge, and enters the pill 18px from its left
  const ax = anchor.x + anchor.w / 2, x = Math.min(Math.max(ax - 18, 12), SPECIMEN.w - w - 12)
  if (side === 'top') { const y = anchor.y - gap - h; return { x, y, w, h, ax, ay: anchor.y - 3, bx: ax, by: y + h } }
  const y = anchor.y + anchor.h + gap
  return { x, y, w, h, ax, ay: anchor.y + anchor.h + 3, bx: ax, by: y }
}

const r2 = (v: number) => Math.round(v * 10) / 10

export function paintInk(refs: Refs, focus: Rect | null, veil: number, outline: number, marks: Placed[]) {
  let svg = ''
  if (focus && veil > 0.001) {
    const f = { x: focus.x - 8, y: focus.y - 8, w: focus.w + 16, h: focus.h + 16 }
    svg += `<path fill-rule="evenodd" fill="${T.canvas}" opacity="${Math.round(veil * 72) / 100}" d="M-10 -10H${SPECIMEN.w + 10}V${SPECIMEN.h + 10}H-10Z M${r2(f.x + 10)} ${r2(f.y)}H${r2(f.x + f.w - 10)}Q${r2(f.x + f.w)} ${r2(f.y)} ${r2(f.x + f.w)} ${r2(f.y + 10)}V${r2(f.y + f.h - 10)}Q${r2(f.x + f.w)} ${r2(f.y + f.h)} ${r2(f.x + f.w - 10)} ${r2(f.y + f.h)}H${r2(f.x + 10)}Q${r2(f.x)} ${r2(f.y + f.h)} ${r2(f.x)} ${r2(f.y + f.h - 10)}V${r2(f.y + 10)}Q${r2(f.x)} ${r2(f.y)} ${r2(f.x + 10)} ${r2(f.y)}Z"/>`
    if (outline > 0.001) svg += `<rect x="${r2(f.x)}" y="${r2(f.y)}" width="${r2(f.w)}" height="${r2(f.h)}" rx="10" fill="none" stroke="${T.wine}" stroke-width="2" pathLength="100" stroke-dasharray="${r2(outline * 100)} 100" opacity="${r2(Math.min(1, veil * 1.5))}"/>`
  }
  const live = new Set<HTMLElement>()
  for (const m of marks) {
    if (m.k <= 0.001) continue
    if (m.kind === 'highlight') {
      for (const ln of m.lines) svg += `<rect x="${r2(ln.x - 3)}" y="${r2(ln.y + ln.h * 0.08)}" width="${r2((ln.w + 6) * m.k)}" height="${r2(ln.h * 0.84)}" rx="3" fill="${T.spark}" fill-opacity="0.3" style="mix-blend-mode:multiply"/>`
      continue
    }
    const w = m.pill.offsetWidth
    const b = pillBox(m.kind, m.kind === 'tag' ? m.anchor : m.span, m.side, w)
    const k = m.k
    if (m.kind === 'bracket') {
      const x = m.side === 'left' ? m.span.x - 18 : m.span.x + m.span.w + 18, d = m.side === 'left' ? 8 : -8
      svg += `<path d="M${r2(x + d)} ${r2(m.span.y)}H${r2(x)}V${r2(m.span.y + m.span.h)}H${r2(x + d)}" fill="none" stroke="${T.wine}" stroke-width="2" pathLength="100" stroke-dasharray="${r2(k * 100)} 100"/>`
      b.ax = x
    }
    svg += `<line x1="${r2(b.ax)}" y1="${r2(b.ay)}" x2="${r2(mix(b.ax, b.bx, k))}" y2="${r2(mix(b.ay, b.by, k))}" stroke="${T.wine}" stroke-width="1.5"/><circle cx="${r2(b.ax)}" cy="${r2(b.ay)}" r="${r2(4.5 * k)}" fill="${T.spark}" stroke="${T.paper}" stroke-width="1.5"/>`
    m.pill.style.transform = `translate(${r2(b.x)}px, ${r2(b.y + (1 - k) * 8)}px)`; m.pill.style.opacity = String(beat(k, 0.35, 0.65, curve.rise))
    live.add(m.pill)
  }
  refs.ink.innerHTML = svg
  for (const el of refs.pills.children as HTMLCollectionOf<HTMLElement>) if (!live.has(el)) el.style.opacity = '0'
}
