// Lab Reel · run — timeline, camera, automatic QA, preview and capture entry.
import { beat, copyHtml, copyPlain, curve, inflate, looseDigits, mix, overlaps, problems, type Copy, type Rect, type Shot, type State, type Story } from './core'
import { Probe, type TextLine } from './probe'
import { build, CANVAS, fill, paintInk, paintSlot, pillBox, pillHtml, placeSlot, SPECIMEN, type Placed, type Refs } from './view'

const TRAVEL = 0.9
const SWAP = { close: 3.0, at: 3.3, open: 3.7 }
/** entry shutter for shots that start in another page state */
const ENTRY = { at: 0.3, open: 0.65 }
const MAX_SCALE = 1.5
const LENGTH = { cover: 3.2, shot: 7, swap: 8, closing: 4.6 }

type GeoMark = (
  | { kind: 'highlight'; lines: Rect[] }
  | { kind: 'tag'; anchor: Rect; side: 'top' | 'right' | 'bottom' | 'left'; pill: HTMLElement }
  | { kind: 'bracket'; span: Rect; side: 'left' | 'right'; pill: HTMLElement }
) & { off?: true }
interface Geo { frame: Rect; focus: Rect | null; marks: GeoMark[]; state: State; zoom: number }
interface Cut { shot: Shot; role: 'cover' | 'shot' | 'closing'; n: number; start: number; length: number; pace: number; entry: State | null; before: State; after: State; geo: Geo[]; pills: HTMLElement[] }
interface Cam { s: number; cx: number; cy: number }

export interface Reel {
  ready: true; length: number; pace: number; seek(t: number): Promise<void>
  beats: { cut: string; label: string; t: number }[]
  poster: number; errors: string[]; warnings: string[]
}
declare global { interface Window { reel?: Reel } }

// ---------- pacing ----------
/** words per second a viewer reads on screen (pt-BR, large type) */
const WPS = 3
const MIN_PACE = 0.7
const words = (c?: Copy) => (c ? copyPlain(c).split(/\s+/).filter(Boolean).length : 0)

/** shortest length (s) that still lets the beats finish and the text be read, at a given pace */
function need(shot: Shot, role: Cut['role'], pace: number) {
  const read = (words(shot.claim) + words(shot.sub)) / WPS + 0.5 * (shot.readouts?.length ?? 0)
  if (role === 'cover') return Math.max(2.4, read) // visible from t = 0
  const beats = (shot.swap ? 4.4 : shot.readouts?.length ? 2.8 : 1.9) * pace + 0.6
  return Math.max(beats, 1.02 * pace + read + (role === 'closing' ? 0.8 : 0.35))
}

function plan(story: Story): { cuts: Cut[]; issues: string[]; pace: number } {
  const order: [Shot, Cut['role']][] = [...(story.cover ? [[story.cover, 'cover'] as [Shot, Cut['role']]] : []), ...story.shots.map(s => [s, 'shot'] as [Shot, Cut['role']]), ...(story.closing ? [[story.closing, 'closing'] as [Shot, Cut['role']]] : [])]
  const issues: string[] = []
  const natural = (shot: Shot, role: Cut['role']) => shot.length ?? (role === 'cover' ? LENGTH.cover : role === 'closing' ? LENGTH.closing : shot.swap ? LENGTH.swap : LENGTH.shot)
  let pace = 1, lengths: number[]
  if (!story.duration) {
    lengths = order.map(([shot, role]) => natural(shot, role))
  } else {
    // speed the beats up (down to MIN_PACE) until the reading floor fits the target, then spread what is left
    const floor = (p: number) => order.map(([shot, role]) => shot.length ?? need(shot, role, p))
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
    while (pace > MIN_PACE && sum(floor(pace)) > story.duration) pace = Math.round((pace - 0.05) * 100) / 100
    lengths = floor(pace)
    const minimum = sum(lengths)
    if (minimum > story.duration + 0.05) {
      issues.push(`duração alvo de ${story.duration} s não cabe: com leitura garantida o mínimo é ${minimum.toFixed(1)} s (${order.map(([s], i) => `${s.id} ${lengths[i].toFixed(1)}`).join(' · ')}). Corte palavras ou tomadas.`)
    } else {
      const extra = story.duration - minimum
      lengths = lengths.map((l, i) => (order[i][0].length ? l : l + (extra * l) / minimum))
    }
  }
  const cuts: Cut[] = []
  let t = 0, state = { ...story.page.base }, n = 0
  order.forEach(([shot, role], i) => {
    const entry = shot.state ? state : null
    if (shot.state) state = { ...state, ...shot.state }
    const after = shot.swap ? { ...state, ...shot.swap } : state
    if (!story.duration && lengths[i] + 0.05 < need(shot, role, 1)) issues.push(`aviso:${shot.id}: ${lengths[i]} s é pouco para ler o texto (precisa de ${need(shot, role, 1).toFixed(1)} s)`)
    cuts.push({ shot, role, n: role === 'shot' ? ++n : 0, start: t, length: lengths[i], pace, entry, before: state, after, geo: [], pills: [] })
    t += lengths[i]; state = after
  })
  return { cuts, issues, pace }
}

const camFor = (geo: Geo, pageW: number): Cam => {
  const s = Math.min(SPECIMEN.w / geo.frame.w, SPECIMEN.h / geo.frame.h, geo.zoom)
  const hw = SPECIMEN.w / (2 * s), hh = SPECIMEN.h / (2 * s)
  const cx = pageW <= 2 * hw ? pageW / 2 : Math.min(Math.max(geo.frame.x + geo.frame.w / 2, hw), pageW - hw)
  return { s, cx, cy: Math.max(geo.frame.y + geo.frame.h / 2, hh) }
}
const project = (r: Rect, c: Cam): Rect => ({ x: (r.x - c.cx) * c.s + SPECIMEN.w / 2, y: (r.y - c.cy) * c.s + SPECIMEN.h / 2, w: r.w * c.s, h: r.h * c.s })
const unproject = (r: Rect, c: Cam): Rect => ({ x: (r.x - SPECIMEN.w / 2) / c.s + c.cx, y: (r.y - SPECIMEN.h / 2) / c.s + c.cy, w: r.w / c.s, h: r.h / c.s })

export async function mountReel(story: Story, host: HTMLElement, o: { capture?: boolean } = {}): Promise<Reel> {
  const refs: Refs = build(host, story)
  await new Promise<void>(done => { refs.iframe.addEventListener('load', () => done(), { once: true }); refs.iframe.src = story.page.src })
  const doc = refs.iframe.contentDocument!
  const freeze = doc.createElement('style')
  freeze.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}html{overflow:hidden!important;scroll-behavior:auto!important}'
  doc.head.append(freeze)
  if (story.page.conceal?.length) {
    const conceal = doc.createElement('style')
    conceal.textContent = `${story.page.conceal.join(',')}{visibility:hidden!important}`
    doc.head.append(conceal)
  }
  await Promise.all([doc.fonts.ready, document.fonts.ready])
  const probe = new Probe(doc, story)
  await probe.settle(story.page.base)
  refs.iframe.height = String(Math.ceil(probe.height()) + 900)

  const errors: string[] = [...problems], warnings: string[] = []
  const { cuts, issues, pace } = plan(story)
  for (const issue of issues) (issue.startsWith('aviso:') ? warnings : errors).push(issue.replace(/^aviso:/, ''))
  const label = (c: Cut) => c.role === 'shot' ? `tomada ${String(c.n).padStart(2, '0')} (${c.shot.id})` : c.role

  // copy checks: digits typed by hand
  const copies = (s: Shot): Copy[] => [s.claim, s.sub ?? '', s.source ?? '', s.eyebrow ?? '', ...(s.readouts ?? []).flatMap(r => r.kind === 'bars' ? r.rows.flatMap(row => [row.label, ...row.parts.map(p => p.label)]) : [r.caption]), ...(s.marks ?? []).flatMap(m => m.kind === 'highlight' ? [] : [m.text])]
  for (const c of cuts) for (const copy of copies(c.shot)) for (const d of looseDigits(copy)) errors.push(`${label(c)}: dígito "${d}" digitado à mão em "${copyPlain(copy)}" — use fact() ou lit()`)

  // warm-up: visit every state once so first-visit async work happens before measuring
  for (const c of cuts) for (const st of c.shot.swap ? [c.before, c.after] : [c.before]) await probe.settle(st)

  // geometry per cut and state
  for (const c of cuts) {
    c.pills = (c.shot.marks ?? []).map(m => {
      if (m.kind === 'highlight') return null as unknown as HTMLElement
      const el = pillHtml(copyHtml(m.text), m.kind === 'tag' ? m.tone : 'wine'); el.style.opacity = '0'; refs.pills.append(el); return el
    })
    for (const [si, st] of (c.shot.swap ? [c.before, c.after] : [c.before]).entries()) {
      const phase = c.shot.swap ? (si ? 'after' : 'before') : null
      try {
        await probe.settle(st)
        c.geo.push({
          state: st,
          zoom: c.shot.zoom ?? MAX_SCALE,
          frame: inflate(probe.rect(c.shot.frame), c.shot.pad ?? 32),
          focus: c.shot.focus ? probe.rect(c.shot.focus) : null,
          marks: (c.shot.marks ?? []).map((m, i): GeoMark => m.when && phase && m.when !== phase ? { kind: 'highlight', lines: [], off: true } : m.kind === 'highlight' ? { kind: 'highlight', lines: probe.lines(m.target) } : m.kind === 'tag' ? { kind: 'tag', anchor: probe.rect(m.target), side: m.side, pill: c.pills[i] } : { kind: 'bracket', span: probe.rect(m.targets), side: m.side, pill: c.pills[i] }),
        })
      } catch (e) { errors.push(`${label(c)}: ${(e as Error).message}`) }
    }
  }
  if (cuts.some(c => !c.geo.length)) { if (!o.capture) report(refs, errors); throw new Error(errors.join('\n')) }

  // layout checks: claim ≤ 3 lines, sub ≤ 2 lines
  const probeSlot = refs.slots[0]
  for (const c of cuts) {
    fill(probeSlot, c.shot)
    const claim = probeSlot.querySelector<HTMLElement>('.rl-claim')!, sub = probeSlot.querySelector<HTMLElement>('.rl-sub')
    if (claim.offsetHeight > 3 * 60 + 4) errors.push(`${label(c)}: claim com mais de 3 linhas`)
    if (sub && sub.offsetHeight > 2 * 34 + 4) errors.push(`${label(c)}: sub com mais de 2 linhas`)
  }
  probeSlot.innerHTML = ''

  // collision checks: tags/brackets over page text or outside the specimen
  const textByState = new Map<string, TextLine[]>()
  for (const c of cuts) for (const g of c.geo) {
    const key = JSON.stringify(g.state)
    if (!textByState.has(key)) { await probe.settle(g.state); textByState.set(key, probe.allText()) }
    const cam = camFor(g, story.page.width)
    for (const m of g.marks) {
      if (m.kind === 'highlight' || m.off) continue
      const anchor = project(m.kind === 'tag' ? m.anchor : m.span, cam)
      const box = pillBox(m.kind, anchor, m.side, m.pill.offsetWidth)
      const name = `${label(c)}: ${m.kind} "${m.pill.textContent}"`
      if (box.x < 8 || box.y < 8 || box.x + box.w > SPECIMEN.w - 8 || box.y + box.h > SPECIMEN.h - 8) warnings.push(`${name} sai do espécime`)
      const hit = textByState.get(key)!.find(t => overlaps(inflate(unproject(box, cam), 2), t))
      if (hit) warnings.push(`${name} cobre o texto "${hit.text.slice(0, 40)}"`)
    }
  }
  await probe.settle(cuts[0].before)
  if (!o.capture) report(refs, errors, warnings)

  const total = cuts.reduce((a, c) => a + c.length, 0)

  const render = async (t: number) => {
    t = Math.min(Math.max(t, 0), total - 1e-4)
    let i = 0
    while (i + 1 < cuts.length && t >= cuts[i + 1].start) i++
    // l is local time in pace-scaled seconds: every beat below speeds up with the pace
    const cut = cuts[i], l = (t - cut.start) / cut.pace, span = cut.length / cut.pace, swapAt = cut.shot.swap ? SWAP.at : null
    const side = swapAt !== null && l >= swapAt ? 1 : 0, geo = cut.geo[side]
    // a shot with its own entry state keeps the previous page until the entry shutter is closed
    const entering = cut.entry !== null && l < ENTRY.at
    const pageState = entering ? cut.entry! : geo.state
    // state changes may be async (driving a demo); in capture each frame waits for them
    if (!probe.isAt(pageState)) await probe.settle(pageState)

    // camera: travel from the previous cut's last framing
    const glide = (a: Cam, b: Cam, k: number): Cam => ({ s: a.s * (b.s / a.s) ** k, cx: mix(a.cx, b.cx, k), cy: mix(a.cy, b.cy, k) })
    const to = camFor(cut.geo[0], story.page.width)
    const from = i > 0 ? camFor(cuts[i - 1].geo[cuts[i - 1].geo.length - 1], story.page.width) : to
    let cam = glide(from, to, i > 0 ? beat(l, 0, TRAVEL) : 1)
    // after a swap the page may have grown: reframe while the shutter opens
    if (side) cam = glide(to, camFor(cut.geo[1], story.page.width), beat(l, SWAP.at, 0.8))
    refs.cam.style.transform = `translate(${(SPECIMEN.w / 2 - cam.cx * cam.s).toFixed(2)}px, ${(SPECIMEN.h / 2 - cam.cy * cam.s).toFixed(2)}px) scale(${cam.s.toFixed(4)})`

    // marks
    const collapse = 1 - beat(l, span - 0.35, 0.35, curve.sweep)
    const shift = side ? SWAP.open - 1.1 : 0
    const placed: Placed[] = geo.marks.map((m, mi) => {
      if (m.off) return { kind: 'highlight', lines: [], k: 0 }
      if (m.kind === 'highlight') return { kind: 'highlight', lines: m.lines.map(r => project(r, cam)), k: beat(l, 1.2 + 0.1 * mi + shift, 0.5, curve.sweep) * collapse }
      const kk = beat(l, 1.4 + 0.08 * mi + shift, 0.5, curve.rise) * collapse
      return m.kind === 'tag' ? { kind: 'tag', anchor: project(m.anchor, cam), side: m.side, pill: m.pill, k: kk } : { kind: 'bracket', span: project(m.span, cam), side: m.side, pill: m.pill, k: kk }
    })
    paintInk(refs, geo.focus ? project(geo.focus, cam) : null, beat(l, 0.9, 0.4) * collapse, beat(l, 0.95, 0.55, curve.sweep), placed)
    const swapShutter = swapAt === null ? 0 : l < SWAP.at ? beat(l, SWAP.close, SWAP.at - SWAP.close) : 1 - beat(l, SWAP.at, SWAP.open - SWAP.at)
    const entryShutter = cut.entry === null ? 0 : l < ENTRY.at ? beat(l, 0, ENTRY.at) : 1 - beat(l, ENTRY.at, ENTRY.open - ENTRY.at)
    refs.shutter.style.opacity = String(Math.max(swapShutter, entryShutter))

    // text slots: the previous cut leaves while this one arrives
    const inSlot = refs.slots[i % 2], outSlot = refs.slots[(i + 1) % 2]
    if (inSlot.dataset.cut !== String(i)) { fill(inSlot, cut.shot); inSlot.dataset.cut = String(i) }
    paintSlot(inSlot, cut.shot, cut.role === 'cover' && i === 0 ? l + 10 : l, swapAt)
    placeSlot(inSlot, 1, 0)
    if (i > 0) {
      const prev = cuts[i - 1]
      if (outSlot.dataset.cut !== String(i - 1)) { fill(outSlot, prev.shot); outSlot.dataset.cut = String(i - 1); paintSlot(outSlot, prev.shot, prev.length / prev.pace, prev.shot.swap ? SWAP.at : null) }
      const e = beat(l, 0, 0.4, curve.rise)
      placeSlot(outSlot, 1 - e, -14 * e)
    } else placeSlot(outSlot, 0, 0)

    // header
    refs.rail.forEach((tick, ti) => {
      const n = ti + 1, v = cut.role === 'closing' ? 1 : cut.role === 'cover' ? 0 : n < cut.n ? 1 : n === cut.n ? l / span : 0
      tick.style.setProperty('--k', v.toFixed(3))
    })
    refs.count.textContent = cut.role === 'shot' ? `${String(cut.n).padStart(2, '0')}/${String(story.shots.length).padStart(2, '0')}` : ''
    refs.all.style.opacity = String(1 - beat(t, total - 0.8, 0.8))
  }

  const beats: Reel['beats'] = []
  for (const c of cuts) {
    const at = (tt: number, name: string) => beats.push({ cut: label(c), label: name, t: c.start + tt * c.pace })
    if (c.role !== 'shot') { at(Math.min(c.length / c.pace - 0.5, 2.2), 'cartão'); continue }
    at(TRAVEL + 0.05, 'enquadrar'); at(2.0, 'marcar'); at(2.9, 'medir')
    if (c.shot.swap) { at(SWAP.at - 0.05, 'obturador'); at(SWAP.open + 1.0, 'troca') }
    at(c.length / c.pace - 0.6, 'leitura')
  }
  const posterCut = cuts.find(c => c.shot.poster) ?? cuts[0]
  await render(0)
  return { ready: true, length: total, pace, seek: render, beats, poster: posterCut.start + posterCut.length - 0.6, errors, warnings }
}

function report(refs: Refs, errors: string[], warnings: string[] = []) {
  if (!errors.length && !warnings.length) return
  const lines = [...errors.map(e => `ERRO   ${e}`), ...warnings.map(w => `AVISO  ${w}`)]
  console[errors.length ? 'error' : 'warn'](lines.join('\n'))
  const box = document.createElement('pre'); box.className = 'rl-errors'; box.textContent = lines.join('\n')
  if (!errors.length) box.style.background = '#6F2F3A'
  refs.root.append(box)
}

// ---------- page entry: ?capture renders bare at 1:1, otherwise an interactive preview ----------
export async function start(story: Story) {
  const capture = new URLSearchParams(location.search).has('capture')
  const page = document.createElement('style')
  page.textContent = capture
    ? 'html,body{margin:0;overflow:hidden;background:#F5F3F1}'
    : `html,body{margin:0;height:100%;background:#2A2522;color:#F5F3F1;font:13px "Geist Mono Variable",monospace}
#rl-room{position:fixed;inset:0 0 72px 0}#rl-fit{position:absolute;left:50%;top:50%;width:${CANVAS.w}px;height:${CANVAS.h}px;box-shadow:0 24px 80px rgb(0 0 0 / .35)}
#rl-bar{position:fixed;left:0;right:0;bottom:0;height:72px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;padding:0 20px;background:#1E1B18}
#rl-bar nav{display:flex;gap:6px}#rl-bar button{min-width:38px;height:32px;border:0;border-radius:16px;background:#3A2C27;color:inherit;font:inherit;cursor:pointer}#rl-bar button.on{background:#D48A46;color:#1E1B18}
#rl-bar input{width:100%;accent-color:#D48A46}#rl-tc{font-variant-numeric:tabular-nums;color:#BCB5AD}`
  document.head.append(page)
  const host = document.createElement('div')
  if (capture) document.body.append(host)
  else { const room = document.createElement('div'); room.id = 'rl-room'; const fit = document.createElement('div'); fit.id = 'rl-fit'; fit.append(host); room.append(fit); document.body.append(room) }
  const reel = await mountReel(story, host, { capture })
  window.reel = reel
  if (capture) return

  const fit = document.getElementById('rl-fit')!
  const scale = () => { fit.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / CANVAS.w, (innerHeight - 72) / CANVAS.h) * 0.94})` }
  scale(); addEventListener('resize', scale)
  const bar = document.createElement('div'); bar.id = 'rl-bar'
  const starts = [...new Set(reel.beats.map(b => b.cut))].map(name => ({ name, t: reel.beats.find(b => b.cut === name)!.t }))
  bar.innerHTML = `<nav><button id="rl-play">▶</button>${starts.map((s, i) => `<button data-i="${i}" title="${s.name}">${s.name.startsWith('tomada') ? s.name.slice(7, 9) : s.name.slice(0, 1).toUpperCase()}</button>`).join('')}</nav><input id="rl-scrub" type="range" min="0" max="${reel.length}" step="0.001" aria-label="Tempo"><span id="rl-tc"></span>`
  document.body.append(bar)
  const scrub = bar.querySelector<HTMLInputElement>('#rl-scrub')!, tc = bar.querySelector<HTMLElement>('#rl-tc')!, playBtn = bar.querySelector<HTMLButtonElement>('#rl-play')!
  const params = new URLSearchParams(location.search)
  let t = Number(params.get('t') ?? 0), playing = !params.has('t'), clock = performance.now()
  let busy = false
  const draw = async () => { if (busy) return; busy = true; await reel.seek(t); busy = false; scrub.value = String(t); tc.textContent = `${t.toFixed(2)}s / ${reel.length.toFixed(1)}s`; playBtn.textContent = playing ? '❚❚' : '▶'; playBtn.classList.toggle('on', playing) }
  const tick = (now: number) => { if (playing) { t = (t + (now - clock) / 1000) % reel.length; draw() } clock = now; requestAnimationFrame(tick) }
  playBtn.onclick = () => { playing = !playing; draw() }
  scrub.oninput = () => { playing = false; t = Number(scrub.value); draw() }
  bar.querySelectorAll<HTMLButtonElement>('[data-i]').forEach(b => { b.onclick = () => { playing = false; t = starts[Number(b.dataset.i)].t - 0.9; if (t < 0) t = 0; draw() } })
  addEventListener('keydown', e => {
    const step = e.shiftKey ? 1 : 1 / 30
    if (e.key === ' ') { e.preventDefault(); playing = !playing } else if (e.key === 'ArrowRight') { playing = false; t = Math.min(reel.length, t + step) } else if (e.key === 'ArrowLeft') { playing = false; t = Math.max(0, t - step) } else return
    draw()
  })
  draw(); requestAnimationFrame(tick)
}
