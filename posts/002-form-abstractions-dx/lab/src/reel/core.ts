// Lab Reel · core — Synko Lab. Types, curves, facts and text.

export interface Rect { x: number; y: number; w: number; h: number }
export type State = Record<string, string>
export type Target = string | { sel: string; line?: RegExp }
export type Pad = number | [top: number, right: number, bottom: number, left: number]

// ---------- curves ----------
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const curve = {
  glide: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  rise: (x: number) => 1 - (1 - x) ** 4,
  sweep: (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
}
/** progress of t inside [from, from + span], shaped by a curve */
export const beat = (t: number, from: number, span: number, shape = curve.glide) => shape(clamp01((t - from) / span))
export const mix = (a: number, b: number, k: number) => a + (b - a) * k

export const hull = (rects: Rect[]): Rect => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h) }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
export const inflate = (r: Rect, pad: Pad): Rect => {
  const [t, rt, b, l] = typeof pad === 'number' ? [pad, pad, pad, pad] : pad
  return { x: r.x - l, y: r.y - t, w: r.w + l + rt, h: r.h + t + b }
}
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// ---------- facts ----------
export interface Fact { readonly kind: 'fact'; value: number; dec: number; unit: string; origin: string }
export interface Literal { readonly kind: 'lit'; text: string }

const nf = new Map<number, Intl.NumberFormat>()
export function format(value: number, dec: number) {
  if (!nf.has(dec)) nf.set(dec, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }))
  return nf.get(dec)!.format(value)
}
export const factText = (f: Fact, value = f.value) => format(value, f.dec) + (f.unit ? ` ${f.unit}` : '')

export const problems: string[] = []

/** facts({ perf: json })('perf:summary.x.median', { dec: 1, unit: 'ms' }) */
export function facts(sources: Record<string, unknown>) {
  return (ref: string, o: { dec?: number; unit?: string } = {}): Fact => {
    const [file, path] = ref.split(':')
    let node: unknown = sources[file]
    for (const key of path.split('.')) node = node != null ? (node as Record<string, unknown>)[key] : undefined
    if (typeof node !== 'number' || !Number.isFinite(node)) problems.push(`fact inválido: ${ref}`)
    return { kind: 'fact', value: typeof node === 'number' ? node : NaN, dec: o.dec ?? 0, unit: o.unit ?? '', origin: ref }
  }
}
export const sum = (...fs: Fact[]): Fact => ({ kind: 'fact', value: fs.reduce((a, f) => a + f.value, 0), dec: Math.max(...fs.map(f => f.dec)), unit: fs[0].unit, origin: fs.map(f => f.origin).join(' + ') })
export const lit = (text: string): Literal => ({ kind: 'lit', text })

// ---------- text ----------
export interface Said { readonly kind: 'said'; parts: (string | Fact | Literal)[] }
export const say = (strings: TemplateStringsArray, ...values: (Fact | Literal | string)[]): Said => {
  const parts: Said['parts'] = []
  strings.forEach((s, i) => { if (s) parts.push(s); if (i < values.length) parts.push(values[i]) })
  return { kind: 'said', parts }
}
export type Copy = string | Said
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const asSaid = (c: Copy): Said => (typeof c === 'string' ? { kind: 'said', parts: [c] } : c)
export const copyHtml = (c: Copy) => asSaid(c).parts.map(p => typeof p === 'string' ? esc(p) : p.kind === 'fact' ? `<span class="rl-fact">${esc(factText(p))}</span>` : esc(p.text)).join('')
export const copyPlain = (c: Copy) => asSaid(c).parts.map(p => typeof p === 'string' ? p : p.kind === 'fact' ? factText(p) : p.text).join('')
/** digits typed by hand (outside fact/lit) */
export const looseDigits = (c: Copy) => asSaid(c).parts.flatMap(p => (typeof p === 'string' ? p.match(/\d+/g) ?? [] : []))

// ---------- story model ----------
export type Readout =
  | { kind: 'count'; caption: string; fact: Fact }
  | { kind: 'shift'; caption: string; from: Fact; to: Fact }
  | { kind: 'bars'; rows: { label: string; parts: { label: string; fact: Fact }[] }[] }

export type Mark =
  | { kind: 'highlight'; target: Target }
  | { kind: 'tag'; target: Target; text: Copy; side: 'top' | 'right' | 'bottom' | 'left'; tone?: 'wine' | 'spark' }
  | { kind: 'bracket'; targets: Target[]; text: Copy; side: 'left' | 'right' }

export interface Shot {
  id: string
  eyebrow?: string
  claim: Copy
  sub?: Copy
  source?: Copy
  frame: Target | Target[]
  pad?: Pad
  focus?: Target | Target[]
  readouts?: Readout[]
  marks?: Mark[]
  swap?: State
  length?: number
  poster?: boolean
}

export interface Story {
  id: string
  brand: string
  address: string
  page: { src: string; width: number; base: State; apply(doc: Document, state: State): void }
  cover?: Shot
  shots: Shot[]
  closing?: Shot
}

export const defineStory = (s: Story) => s
