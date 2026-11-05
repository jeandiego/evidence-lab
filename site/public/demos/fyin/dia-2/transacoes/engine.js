/* ---------- Formatação (pt-BR) ---------- */
const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = v => 'R$ ' + nf.format(Math.abs(v));
const MINUS = '−';
const signed = v => (v < 0 ? MINUS : '+') + 'R$ ' + nf.format(Math.abs(v));
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const ymd = s => s.split('-').map(Number);
const dobj = s => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => { const d = dobj(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dm = s => { const [, m, d] = ymd(s); return `${d} ${MES[m - 1]}`; };
const longDate = s => { const [, m, d] = ymd(s); return `${cap(WD[dobj(s).getUTCDay()])}, ${d} de ${MES_L[m - 1]}`; };
const dayLabel = s => s === TODAY ? 'Hoje' : s === addDays(TODAY, -1) ? 'Ontem' : (() => { const [, m, d] = ymd(s); return `${cap(WD[dobj(s).getUTCDay()])}, ${d} ${MES[m - 1]}`; })();
const plural = (n, a, b) => `${n.toLocaleString('pt-BR')} ${n === 1 ? a : b}`;
function amtHTML(v, { cls = '', sign = false, share = '' } = {}) {
  const [m, c] = nf.format(Math.abs(v)).split(',');
  const sg = sign ? `<span class="sg ${v < 0 ? 'neg' : 'pos'}">${v < 0 ? MINUS : '+'}</span>` : '';
  return `<div class="amt ${cls}"${share ? ` data-share="${share}"` : ''}>${sg}<span class="cur">R$</span><span class="main">${m}</span><span class="cents">,${c}</span></div>`;
}
const norm = s => [...s].map(ch => ch.normalize('NFD')[0].toLowerCase()).join(''); // mantém o comprimento: serve para destacar

/* ---------- Mola sem bounce (quadro 13): p(t) = 1 − (1 + ωt)·e^(−ωt) ---------- */
const params = new URLSearchParams(location.search);
const SLOW = Math.max(1, Number(params.get('slow')) || 1);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OMEGA = { open: 18, back: 20, close: 24, filter: 20, search: 20, sheet: 20, period: 20 };
let INSTANT = false;
const lerp = (a, b, p) => a + (b - a) * p;
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const springP = (w, t) => 1 - (1 + w * t) * Math.exp(-w * t);
// A mesma mola em CSS (linear()), para o que é só transição de propriedade: polegar, switch, botões do dock.
(() => {
  const w = 20, T = 9.2 / w, n = 28, pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : springP(w, T * i / n).toFixed(4));
  const root = document.documentElement.style;
  root.setProperty('--sp', `linear(${pts.join(',')})`);
  root.setProperty('--spd', Math.round(T * 1000 * SLOW) + 'ms');
  if (SLOW > 1) for (const [k, v] of [['--instant', 100], ['--quick', 160], ['--base', 240]]) root.setProperty(k, v * SLOW + 'ms');
})();

function tween(omega, fn, done) {
  if (INSTANT) { fn(1, 1); done && done(); return { stop() {}, finish() {} }; }
  const t0 = performance.now(); let raf, live = true;
  const step = now => {
    if (!live) return;
    const t = (now - t0) / 1000 / SLOW;
    let p = REDUCE ? 1 : springP(omega, t);
    const f = REDUCE ? clamp01(t / 0.2) : p; // Reduzir movimento: geometria salta, só a opacidade cruza
    const fin = REDUCE ? f >= 1 : p > 0.998;
    if (fin) p = 1;
    fn(p, fin ? 1 : f);
    if (fin) { live = false; done && done(); } else raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { stop() { live = false; cancelAnimationFrame(raf); }, finish() { if (!live) return; live = false; cancelAnimationFrame(raf); fn(1, 1); done && done(); } };
}

const $ = id => document.getElementById(id);
const phone = $('phone'), flight = $('flight'), scrimEl = $('scrim');
const rel = el => { const a = el.getBoundingClientRect(), b = phone.getBoundingClientRect(); const s = b.width / 402; return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s }; };
const INK = [22, 22, 22], WHITE = [255, 255, 255];
const SURFACES = [];
function syncScrim() {
  const s = Math.max(0, ...SURFACES.map(x => x.cur && x.el.style.display !== 'none' ? x.cur.s : 0));
  scrimEl.style.opacity = s;
}

/* ---------- Superfície que se transforma (o mesmo motor dos quadros 16 e 17) ----------
   rect = { x, y, w, h, r, c (0 tinta → 1 papel), e (elevação), s (scrim) } */
class Surface {
  constructor(el) { this.el = el; this.cur = null; this.layer = null; this.run = null; SURFACES.push(this); }
  apply(m) {
    const st = this.el.style;
    st.transform = `translate(${m.x}px, ${m.y}px)`;
    st.width = m.w + 'px'; st.height = m.h + 'px'; st.borderRadius = m.r + 'px';
    st.background = `rgb(${INK.map((v, i) => Math.round(lerp(v, WHITE[i], m.c))).join(',')})`;
    st.boxShadow = `0 ${4 + 20 * m.e}px ${14 + 46 * m.e}px rgba(14,13,13,${0.26 * m.e}), inset 0 0 0 1px rgba(14,13,13,${0.06 * m.c * m.e})`;
    syncScrim();
  }
  set(rect) { this.cur = { ...rect }; this.el.style.display = 'block'; this.apply(this.cur); }
  makeLayer(html, cls = '') {
    const el = document.createElement('div'); el.className = 'layer ' + cls; el.innerHTML = html;
    this.el.appendChild(el); return el;
  }
  finish() { if (this.run) { const r = this.run; this.run = null; r.h.finish(); } }
  abandon() { if (this.run) { const r = this.run; this.run = null; r.h.stop(); r.abandon(); } }
  /* next = nova camada (cruza com a atual) ou null (só a geometria muda). Pares data-share voam entre camadas. */
  morph({ to, next = null, omega, extra, end }) {
    this.abandon();
    const from = { ...this.cur }, prev = this.layer, pairs = [];
    const prevStart = prev ? Number(prev.style.opacity || 1) : 1;
    if (prev && next) {
      const ow = this.el.style.width; this.el.style.width = to.w + 'px';
      const lay = rel(this.el);
      for (const nEl of next.querySelectorAll('[data-share]')) {
        const oEl = prev.querySelector(`[data-share="${nEl.dataset.share}"]`);
        if (!oEl || !oEl.getClientRects().length) continue;
        const o = rel(oEl), n0 = rel(nEl);
        const n = { x: to.x + (n0.x - lay.x), y: to.y + (n0.y - lay.y) - (next.classList.contains('bottom') ? lay.h - to.h : 0) - next.scrollTop, w: n0.w, h: n0.h };
        const oc = oEl.cloneNode(true), nc = nEl.cloneNode(true);
        for (const [c, r] of [[oc, o], [nc, n]]) { c.removeAttribute('data-share'); c.style.width = r.w + 'px'; c.style.height = r.h + 'px'; flight.appendChild(c); }
        oEl.style.visibility = nEl.style.visibility = 'hidden';
        pairs.push({ o, n, oc, nc, oEl, nEl });
      }
      this.el.style.width = ow;
    }
    if (next) next.style.opacity = 0;
    const cleanPairs = () => { for (const q of pairs) { q.oc.remove(); q.nc.remove(); q.oEl.style.visibility = q.nEl.style.visibility = ''; } };
    const h = tween(omega, (p, f) => {
      const cp = to.c > from.c ? ease(p / 0.4) : to.c < from.c ? ease((p - 0.6) / 0.4) : p; // a cor chega cedo ao abrir, tarde ao voltar
      this.cur = { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), w: lerp(from.w, to.w, p), h: lerp(from.h, to.h, p), r: lerp(from.r, to.r, p),
        c: lerp(from.c, to.c, cp), e: lerp(from.e, to.e, p), s: lerp(from.s, to.s, p) };
      this.apply(this.cur);
      if (prev && next) {
        const po = 1 - ease(f / 0.3), no = ease((f - 0.3) / 0.5);
        prev.style.opacity = prevStart * po; prev.style.filter = REDUCE ? '' : `blur(${(1 - po) * 4}px)`;
        next.style.opacity = no; next.style.filter = no < 1 && !REDUCE ? `blur(${(1 - no) * 4}px)` : '';
        next.style.transform = REDUCE ? '' : `translateY(${(1 - ease(p)) * 4}px)`;
      }
      for (const q of pairs) {
        const x = lerp(q.o.x, q.n.x, p), y = lerp(q.o.y, q.n.y, p), hh = lerp(q.o.h, q.n.h, p);
        q.oc.style.transform = `translate(${x}px,${y}px) scale(${hh / q.o.h})`;
        q.nc.style.transform = `translate(${x}px,${y}px) scale(${hh / q.n.h})`;
        q.oc.style.opacity = 1 - ease(f / 0.55); q.nc.style.opacity = ease((f - 0.2) / 0.55);
      }
      if (extra) extra(p, f);
    }, () => {
      this.run = null; this.cur = { ...to }; this.apply(this.cur); cleanPairs();
      if (prev && next && prev !== next) prev.remove();
      if (next) { next.style.opacity = next.style.filter = next.style.transform = ''; this.layer = next; }
      if (end) end();
    });
    this.run = { h, abandon: () => {
      cleanPairs();
      if (prev && next && prev !== next) { prev.remove(); next.style.opacity = next.style.filter = next.style.transform = ''; this.layer = next; }
      if (extra) extra(1, 1);
    } };
    if (INSTANT) this.finish();
  }
}
