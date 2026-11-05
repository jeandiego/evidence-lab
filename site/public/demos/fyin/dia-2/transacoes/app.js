/* ---------- Estado ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const DEFAULT_F = { period: 'month:2026-10', type: 'all', cats: [], accs: [], min: null, max: null, status: 'all', transfers: false };
const state = { scope: 'Casa', f: clone(DEFAULT_F), q: '', view: 'list', draft: null, loading: false, error: false, cached: new Set(['2026-10']), detail: null };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const person = t => PEOPLE[ACC[t.accId].owner].name;

function lastDay(key) { const [y, m] = key.split('-').map(Number); return `${key}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; }
function periodRange(p) {
  if (p.startsWith('month:')) { const k = p.slice(6); return [k + '-01', lastDay(k)]; }
  if (p === 'last30') return [addDays(TODAY, -29), TODAY];
  const [, a, b] = p.split(':'); return [a, b || a];
}
function periodLabel(p) {
  if (p.startsWith('month:')) return cap(MES_L[Number(p.slice(11, 13)) - 1]);
  if (p === 'last30') return 'Últimos 30 dias';
  const [a, b] = periodRange(p); return a === b ? dm(a) : `${dm(a)} – ${dm(b)}`;
}
const periodMonths = p => { const [a, b] = periodRange(p); const out = new Set(); for (let d = a; d <= b; d = addDays(d, 27)) out.add(d.slice(0, 7)); out.add(b.slice(0, 7)); return [...out]; };

/* Busca: nome, categoria, descrição do banco, conta, pessoa e valor (130 · 130,70 · 1.289,40) */
function matchQuery(t, q) {
  const n = norm(q.trim()); if (!n) return true;
  if (/^[\d.,]+$/.test(n)) {
    const qn = n.replace(/\.(\d{1,2})$/, ',$1').replace(/\./g, '');
    return nf.format(Math.abs(t.amount)).replace(/\./g, '').startsWith(qn);
  }
  return [t.name, CAT[t.cat].name, t.desc, ACC[t.accId].name, person(t)].some(v => norm(v).includes(n));
}
function passes(t, f, scope, q, { ignoreCats = false } = {}) {
  const [a, b] = periodRange(f.period);
  if (t.date < a || t.date > b) return false;
  if (scope !== 'Casa' && person(t) !== scope) return false;
  if (t.kind === 'transfer' && !f.transfers) return false;
  if (f.type === 'out' && !(t.kind === 'regular' && t.amount < 0)) return false;
  if (f.type === 'in' && !(t.kind === 'regular' && t.amount > 0)) return false;
  if (!ignoreCats && f.cats.length && !f.cats.includes(t.cat)) return false;
  if (f.accs.length && !f.accs.includes(t.accId)) return false;
  const abs = Math.abs(t.amount);
  if (f.min != null && abs < f.min) return false;
  if (f.max != null && abs > f.max) return false;
  if (f.status === 'pending' && t.status !== 'pending') return false;
  if (f.status === 'posted' && t.status === 'pending') return false;
  return matchQuery(t, q);
}
const visible = (f = state.f, scope = state.scope, q = state.q) => TX.filter(t => passes(t, f, scope, q)).sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time));
const advCount = f => (f.accs.length ? 1 : 0) + (f.min != null || f.max != null ? 1 : 0) + (f.status !== 'all' ? 1 : 0) + (f.transfers ? 1 : 0);
const activeCount = f => (f.type !== 'all' ? 1 : 0) + (f.cats.length ? 1 : 0) + advCount(f);

/* Somas: transferências entre vocês e pagamento de fatura nunca entram (as compras do cartão já contam). */
function summarize(list) {
  const s = { out: 0, in: 0, nOut: 0, nIn: 0, pend: 0, nPend: 0, inv: 0, nInv: 0, nTr: 0, n: list.length };
  for (const t of list) {
    if (t.kind === 'transfer') { s.nTr++; continue; }
    if (t.kind === 'invoice') { s.nInv++; s.inv += -t.amount; continue; }
    if (t.amount < 0) { s.out += -t.amount; s.nOut++; if (t.status === 'pending') { s.pend += -t.amount; s.nPend++; } }
    else { s.in += t.amount; s.nIn++; }
  }
  // Na casa, cada Pix entre vocês aparece duas vezes (saiu de um, entrou no outro): conta uma.
  const tr = TX.filter(t => t.kind === 'transfer' && passes(t, { ...state.f, transfers: true, type: 'all' }, state.scope, state.q));
  s.nTr = state.scope === 'Casa' ? tr.filter(t => t.amount < 0).length : tr.length;
  return s;
}

/* ---------- Cabeçalho ---------- */
const scroller = $('scroller'), listEl = $('list');
function renderScope() {
  const box = $('scopePills');
  box.querySelectorAll('.pill').forEach(p => p.remove());
  box.insertAdjacentHTML('beforeend', SCOPES.map(s => `<button class="pill" role="radio" data-scope="${s}" aria-checked="${s === state.scope}">${s}</button>`).join(''));
  placeThumb(box, '.pill', '.thumb', true);
}
function placeThumb(box, sel, thumbSel, jump) {
  const on = box.querySelector(`${sel}[aria-checked="true"]`), th = box.querySelector(thumbSel);
  if (!on || !th) return;
  if (jump) th.style.transition = 'none';
  th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft}px)`;
  if (jump) { th.offsetWidth; th.style.transition = ''; }
}
function ctxParts(f, q) {
  const out = [];
  if (q.trim()) out.push(`“${esc(q.trim())}”`);
  if (f.type !== 'all') out.push(f.type === 'out' ? 'Saídas' : 'Entradas');
  if (f.cats.length) out.push(f.cats.length <= 2 ? f.cats.map(c => CAT[c].name).join(', ') : `${CAT[f.cats[0]].name} +${f.cats.length - 1}`);
  if (f.accs.length) out.push(f.accs.length === 1 ? ACC[f.accs[0]].short : `${f.accs.length} contas`);
  if (f.min != null || f.max != null) out.push(f.min != null && f.max != null ? `R$ ${f.min}–${f.max}` : f.min != null ? `acima de R$ ${f.min}` : `até R$ ${f.max}`);
  if (f.status !== 'all') out.push(f.status === 'pending' ? 'Pendentes' : 'Concluídas');
  if (f.transfers) out.push('com transferências');
  return out;
}
function renderCtx() {
  const ctx = $('ctx'), parts = ctxParts(state.f, state.q), show = parts.length && !state.loading;
  ctx.hidden = !show;
  if (show) {
    const n = visible().length, all = visible({ ...DEFAULT_F, period: state.f.period }, state.scope, '').length;
    const onlyQ = !activeCount(state.f);
    ctx.innerHTML = `<button class="ctx-t" data-act="${onlyQ ? 'search-focus' : 'filters'}"><b>${n}</b> de ${all} · ${parts.join(' · ')}</button>
      <button class="ctx-x" data-act="clear-all">Limpar</button>`;
  }
  document.documentElement.style.setProperty('--scopeH', $('scope').offsetHeight + 'px');
}
function renderHeader() { $('pv').textContent = periodLabel(state.f.period); renderCtx(); }

/* ---------- Lista ---------- */
function hl(text, q) {
  const n = norm(q.trim()); if (!n || /^[\d.,]+$/.test(n)) return esc(text);
  const i = norm(text).indexOf(n); if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + n.length)) + '</mark>' + esc(text.slice(i + n.length));
}
function metaOf(t) {
  const acc = ACC[t.accId], c = CAT[t.cat], parts = [];
  if (t.kind === 'transfer') return ['Transferência entre vocês', 'fora das somas'];
  if (t.kind === 'invoice') return ['Pagamento de fatura', 'fora das saídas'];
  if (t.status === 'pending') parts.push('<span class="pd"></span>Pendente');
  parts.push(c.name);
  if (t.inst) parts.push(`Parcela ${t.inst[0]}/${t.inst[1]}`);
  parts.push(acc.short);
  return parts;
}
function rowHTML(t) {
  const c = CAT[t.cat], q = state.q;
  const cls = t.kind !== 'regular' ? 'muted' : t.amount > 0 ? 'in' : t.status === 'pending' ? 'pend' : '';
  const meta = metaOf(t).map(m => m.startsWith('<') ? m : hl(m, q)).join(' · ');
  const who = state.scope === 'Casa' ? `<span class="who"><i>${PEOPLE[ACC[t.accId].owner].ini}</i>${person(t)}</span>` : '';
  return `<button class="tx" data-tx="${t.id}" aria-label="${esc(t.name)}, ${signed(t.amount)}, ${c.name}, ${person(t)}${t.status === 'pending' ? ', pendente' : ''}">
    <span class="dot${t.cat === 'semcat' ? ' q' : ''}" data-share="dot"><i class="ph ph-${c.icon}"></i></span>
    <span class="tx-t"><span class="tx-n" data-share="name">${hl(t.name, q)}</span><span class="tx-m">${meta}</span></span>
    <span class="tx-r"><span class="tx-v ${cls}" data-share="amt">${signed(t.amount)}</span>${who}</span></button>`;
}
function dayTotal(rows) {
  const out = rows.filter(t => t.kind === 'regular' && t.amount < 0).reduce((s, t) => s - t.amount, 0);
  if (out) return `Saídas ${brl(out)}`;
  const inn = rows.filter(t => t.kind === 'regular' && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  return inn ? `Entradas ${brl(inn)}` : plural(rows.length, 'transferência', 'transferências');
}
function emptyHTML() {
  const q = state.q.trim(), pl = periodLabel(state.f.period), where = `${state.scope === 'Casa' ? 'da casa' : 'de ' + state.scope} ${state.f.period.startsWith('month:') ? 'em ' + pl.toLowerCase() : '· ' + pl}`;
  const title = q ? `Nada com “${esc(q)}”` : 'Nenhuma transação com esses filtros';
  const body = q ? `Buscamos nas transações ${where}, por nome, categoria, descrição do banco e valor.` : `Nas transações ${where}, nada combina com ${ctxParts(state.f, '').join(', ').toLowerCase()}.`;
  const alt = state.scope !== 'Casa' ? `<button class="btnt" data-act="scope-casa">Buscar na casa toda</button>` : '';
  return `<div class="empty"><span class="dot"><i class="ph ph-magnifying-glass"></i></span><div><h2>${title}</h2><p>${body}</p></div>
    <div class="acts"><button class="btn2" data-act="clear-all">${q && !activeCount(state.f) ? 'Limpar busca' : 'Limpar filtros'}</button>${alt}</div></div>`;
}
const skeletonHTML = () => [0, 1].map(() => `<div class="dayhead"><span class="sk" style="width:84px;height:12px"></span></div>` +
  [96, 72, 120, 84].map(w => `<div class="skrow"><span class="sk c"></span><span style="flex:1;display:flex;flex-direction:column;gap:8px"><span class="sk" style="width:${w + 40}px;height:12px"></span><span class="sk" style="width:${w}px;height:10px"></span></span><span class="sk" style="width:64px;height:12px"></span></div>`).join('')).join('');
function listHTML() {
  if (state.loading) return skeletonHTML();
  const rows = visible();
  const err = state.error ? `<div class="retry"><span class="dot" style="background:var(--bg)"><i class="ph ph-wifi-slash"></i></span><div class="t"><b>Não deu para atualizar agora</b><span>Mostrando o que foi salvo hoje, 9:38</span></div><button class="btn2 sm" data-act="retry">Tentar agora</button></div>` : '';
  if (!rows.length) return err + emptyHTML();
  const days = new Map();
  for (const t of rows) { if (!days.has(t.date)) days.set(t.date, []); days.get(t.date).push(t); }
  return err + [...days].map(([d, list]) => `<section class="day"><div class="dayhead"><span class="dh-d">${dayLabel(d)}</span><span class="dh-t">${dayTotal(list)}</span></div>${list.map(rowHTML).join('')}</section>`).join('');
}
function renderList(anim = false) {
  const html = listHTML();
  const old = listEl.querySelector('.list-in');
  listEl.querySelectorAll('.list-out').forEach(o => o.remove());
  if (!anim || !old || INSTANT) { listEl.innerHTML = `<div class="list-in">${html}</div>`; renderFoot(); return; }
  old.className = 'list-out';
  const nw = document.createElement('div'); nw.className = 'list-in'; nw.innerHTML = html; nw.style.opacity = 0;
  listEl.appendChild(nw);
  tween(OMEGA.filter, (p, f) => {
    old.style.opacity = 1 - ease(f / 0.3);
    nw.style.opacity = ease((f - 0.2) / 0.5);
    nw.style.transform = REDUCE ? '' : `translateY(${(1 - ease(p)) * 6}px)`;
  }, () => { old.remove(); nw.style.opacity = nw.style.transform = ''; });
  renderFoot();
}
function renderFoot() {
  const dockTop = state.view === 'search' ? 474 : 790;
  $('listfoot').style.paddingBottom = (874 - dockTop + 28) + 'px';
  $('listfoot').innerHTML = state.loading ? '' : `<div class="status"><i class="ph ph-arrows-clockwise"></i>${state.error ? 'Último dado salvo hoje, 9:38' : 'Atualizado hoje, 9:38 · Itaú, Nubank e Inter'}</div>`;
}
// Trocar recorte: mesmo lugar, lista nova. Mês ainda não carregado mostra skeleton (300ms–2s, quadro 10).
function refresh({ anim = true, top = true } = {}) {
  const need = periodMonths(state.f.period).filter(k => !state.cached.has(k));
  if (need.length && !INSTANT) {
    state.loading = true; renderHeader(); renderList(anim);
    setTimeout(() => { need.forEach(k => state.cached.add(k)); state.loading = false; renderHeader(); renderList(true); }, 900 * SLOW);
  } else { need.forEach(k => state.cached.add(k)); renderHeader(); renderList(anim); }
  if (top && scroller.scrollTop > 0) scroller.scrollTo({ top: 0, behavior: INSTANT || REDUCE ? 'auto' : 'smooth' });
  if (typeof renderDockBadge === 'function') renderDockBadge();
}
function setScope(s) {
  if (s === state.scope) return;
  state.scope = s;
  if (s !== 'Casa') state.f.accs = state.f.accs.filter(a => PEOPLE[ACC[a].owner].name === s);
  const box = $('scopePills');
  box.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-checked', p.dataset.scope === s));
  placeThumb(box, '.pill', '.thumb');
  refresh({ top: false });
}

/* Título grande recolhe para o título inline; a borda aparece quando a lista passa por baixo. */
scroller.addEventListener('scroll', () => {
  const y = scroller.scrollTop;
  $('navTitle').style.opacity = clamp01((y - 22) / 16);
  $('scope').classList.toggle('stuck', y > 50);
}, { passive: true });
