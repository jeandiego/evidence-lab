/* ---------- Dock: a cápsula que vira busca, filtros e resumo ---------- */
const dock = new Surface($('dock')), modal = new Surface($('modal')), pop = new Surface($('pop'));
const DOCK = { x: 12, y: 790, w: 378, h: 56, r: 28, c: 0, e: 0.45, s: 0 };
const KB_H = 336, SEARCH = { ...DOCK, y: 874 - KB_H - 8 - 56 };
const MED = 600, LARGE = 800;
const sheet = h => ({ x: 12, y: 862 - h, w: 378, h, r: 43, c: 1, e: 1, s: 1 });
const kb = $('kb');

function dockHTML() {
  const n = activeCount(state.f), s = state.view === 'search';
  return `<div class="dock${s ? ' searching' : ''}">
    <label class="well"><i class="ph ph-magnifying-glass"></i>
      <input id="q" type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${s ? 'Loja, categoria ou valor' : 'Buscar'}" value="${esc(state.q)}" aria-label="Buscar transações">
      <button class="qclear" data-act="q-clear" aria-label="Limpar busca"${state.q ? '' : ' hidden'}><i class="ph-fill ph-x-circle"></i></button></label>
    <button class="dbtn dopt" data-act="filters" aria-label="Filtros${n ? `, ${n} ativos` : ''}"><i class="ph ph-sliders-horizontal"></i><span class="badge"${n ? '' : ' hidden'}>${n || ''}</span></button>
    <button class="dbtn dopt" data-act="summary" aria-label="Resumo do período"><i class="ph ph-plus-minus"></i></button>
    <button class="dbtn kbd" data-act="kb-hide" aria-label="Ocultar teclado"><i class="ph ph-caret-down"></i></button></div>`;
}
function mountDock() { dock.el.innerHTML = ''; dock.layer = dock.makeLayer(dockHTML(), 'bottom'); dock.set(DOCK); }
function renderDockBadge() {
  const b = dock.el.querySelector('.badge'); if (!b) return;
  const n = activeCount(state.f); b.hidden = !n; if (n) b.textContent = n;
  b.parentElement.setAttribute('aria-label', `Filtros${n ? `, ${n} ativos` : ''}`);
}
const qInput = () => dock.el.querySelector('#q');

/* ---------- Busca: a cápsula sobe com o teclado; a lista responde a cada letra ---------- */
function enterSearch() {
  if (state.view === 'search') return;
  if (state.view !== 'list') return qInput()?.blur();
  state.view = 'search';
  const d = dock.el.querySelector('.dock'); d.classList.add('searching');
  qInput().placeholder = 'Loja, categoria ou valor';
  renderKB(); renderFoot();
  dock.morph({ to: SEARCH, omega: OMEGA.search, extra: p => { kb.style.transform = `translateY(${(1 - p) * 100}%)`; } });
}
function exitSearch() {
  if (state.view !== 'search') return;
  state.view = 'list';
  const d = dock.el.querySelector('.dock'); d.classList.remove('searching');
  const i = qInput(); i.placeholder = 'Buscar'; i.blur();
  renderFoot();
  dock.morph({ to: DOCK, omega: OMEGA.search, extra: p => { kb.style.transform = `translateY(${p * 100}%)`; } });
}
function onQuery(v) {
  state.q = v;
  dock.el.querySelector('.qclear').hidden = !v;
  renderList(false); renderCtx(); renderKBSug();
}
const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function renderKB() {
  kb.innerHTML = `<div class="kb-sug" id="kbs"></div>
    <div class="kb-row">${[...KEYS[0]].map(k => `<button class="k" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="kb-row">${[...KEYS[1]].map(k => `<button class="k" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="kb-row"><button class="k sp" tabindex="-1"><i class="ph ph-arrow-fat-up"></i></button><span style="width:8px"></span>${[...KEYS[2]].map(k => `<button class="k" data-k="${k}">${k}</button>`).join('')}<span style="width:8px"></span><button class="k sp" data-k="del"><i class="ph ph-backspace"></i></button></div>
    <div class="kb-row"><button class="k sp" data-k="123" style="flex-basis:92px">123</button><button class="k w" data-k=" ">espaço</button><button class="k go" data-k="go">buscar</button></div>
    <div class="kb-sys"><i class="ph ph-globe"></i><i class="ph ph-microphone"></i></div>`;
  renderKBSug();
}
// Sugestões do teclado: completam com nomes e categorias que existem no recorte atual.
function renderKBSug() {
  const box = $('kbs'); if (!box) return;
  const q = norm(state.q.trim());
  const pool = [...new Set(TX.filter(t => passes(t, state.f, state.scope, '')).flatMap(t => [t.name, CAT[t.cat].name]))];
  const sug = q ? pool.filter(w => norm(w).startsWith(q) && norm(w) !== q).slice(0, 3) : ['mercado', 'uber', 'farmácia'];
  while (sug.length < 3) sug.push('');
  box.innerHTML = sug.map(w => `<button data-sug="${esc(w)}">${esc(w)}</button>`).join('');
}
kb.addEventListener('pointerdown', e => e.preventDefault()); // o campo não perde o foco
kb.addEventListener('click', e => {
  const i = qInput(), s = e.target.closest('[data-sug]'), k = e.target.closest('[data-k]');
  if (s && s.dataset.sug) { i.value = s.dataset.sug; onQuery(i.value); return; }
  if (!k) return;
  const key = k.dataset.k;
  if (key === 'go') return exitSearch();
  if (key === '123') return;
  i.value = key === 'del' ? i.value.slice(0, -1) : i.value + key;
  onQuery(i.value);
});

/* ---------- Folha de filtros: rascunho até "Mostrar"; fechar descarta ---------- */
let fLayer = null, catOrder = [], moreCats = false, advOpen = false, calKey = TODAY.slice(0, 7), customOn = false;
const draftCount = () => visible(state.draft, state.draft.person, state.q).length;
const sameF = (a, b) => JSON.stringify({ ...a, person: undefined }) === JSON.stringify({ ...b, person: undefined });
function periodPills(d) {
  const opts = [['month:2026-10', 'Este mês'], ['month:2026-09', 'Mês passado'], ['last30', 'Últimos 30 dias']];
  if (d.period.startsWith('month:') && !opts.some(o => o[0] === d.period)) opts.push([d.period, periodLabel(d.period)]);
  const custom = customOn || d.period.startsWith('range:');
  return opts.map(([v, l]) => `<button class="spill" role="radio" data-fp="${v}" aria-checked="${!custom && d.period === v}">${l}</button>`).join('') +
    `<button class="spill" role="radio" data-fp="custom" aria-checked="${custom}">Personalizado</button>`;
}
function calHTML(d) {
  if (!(customOn || d.period.startsWith('range:'))) return '';
  const [y, m] = calKey.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const [a, b] = d.period.startsWith('range:') ? periodRange(d.period) : [null, null];
  let cells = 'DSTQQSS'.split('').map(w => `<span class="wd">${w}</span>`).join('') + '<span></span>'.repeat(first);
  for (let i = 1; i <= days; i++) {
    const s = `${calKey}-${String(i).padStart(2, '0')}`, cls = [];
    if (a && s === a) cls.push('s'); if (b && s === b) cls.push('e'); if (a && b && s > a && s < b) cls.push('mid'); if (s === TODAY) cls.push('today');
    cells += `<button class="${cls.join(' ')}" data-cd="${s}"${s > TODAY ? ' disabled' : ''} aria-label="${longDate(s)}"><span>${i}</span></button>`;
  }
  const lbl = !a ? 'Toque no primeiro dia' : a === b && state.calPick === 'end' ? `De ${dm(a)} · toque no último dia` : `De ${dm(a)} a ${dm(b)}`;
  return `<div class="cal"><div class="cal-h"><button class="ib" data-act="cal-prev" aria-label="Mês anterior"${calKey <= '2026-07' ? ' disabled' : ''}><i class="ph ph-caret-left"></i></button>
    <b>${cap(MES_L[m - 1])} ${y}</b><button class="ib" data-act="cal-next" aria-label="Próximo mês"${calKey >= TODAY.slice(0, 7) ? ' disabled' : ''}><i class="ph ph-caret-right"></i></button></div>
    <div class="cal-g">${cells}</div><div class="cal-lbl">${lbl}</div></div>`;
}
function catsHTML(d) {
  const base = TX.filter(t => passes(t, d, d.person, state.q, { ignoreCats: true }));
  const n = Object.fromEntries(PICKABLE.map(c => [c, base.filter(t => t.cat === c).length]));
  const show = moreCats ? catOrder : catOrder.filter((c, i) => i < 8 || d.cats.includes(c));
  return show.map(c => {
    const on = d.cats.includes(c), off = !n[c] && !on;
    return `<button class="chip" role="checkbox" data-fc="${c}" aria-checked="${on}"${off ? ' aria-disabled="true"' : ''}><span class="ic"><i class="ph ph-${CAT[c].icon} cat"></i><i class="ph ph-check"></i></span>${CAT[c].name}<span class="n">${n[c]}</span></button>`;
  }).join('');
}
function accsHTML(d) {
  return Object.entries(ACC).map(([id, a]) => {
    const owner = PEOPLE[a.owner].name, off = d.person !== 'Casa' && owner !== d.person;
    return `<button class="acc" role="checkbox" data-fa="${id}" aria-checked="${d.accs.includes(id)}"${off ? ' aria-disabled="true" style="opacity:.35;cursor:default"' : ''}>
      <span class="bav" style="background:${a.color}">${a.ini}</span><span class="t"><b>${a.name}${a.last4 ? ` <span style="display:inline;color:var(--text-3);font-size:15px">•• ${a.last4}</span>` : ''}</b><span>${owner}</span></span><span class="cb"><i class="ph ph-check"></i></span></button>`;
  }).join('');
}
const segHTML = (key, cur, opts) => `<div class="seg" role="radiogroup"><span class="sthumb"></span>${opts.map(([v, l]) => `<button role="radio" data-${key}="${v}" aria-checked="${cur === v}">${l}</button>`).join('')}</div>`;
function filtersHTML() {
  const d = state.draft;
  return `<div class="fs-head" data-drag><div class="grab"></div><div class="fs-row"><div class="fs-title">Filtros</div>
      <button class="ib" data-act="panel-close" aria-label="Fechar sem aplicar"><i class="ph ph-x"></i></button></div></div>
    <div class="fs-body" id="fbody">
      <section class="fsec" style="padding-top:6px"><div class="fh"><h3>Período</h3></div><div class="row-pills scrollx" role="radiogroup" id="fper">${periodPills(d)}</div><div id="fcal">${calHTML(d)}</div></section>
      <section class="fsec"><div class="fh"><h3>Tipo</h3></div>${segHTML('ft', d.type, [['all', 'Todas'], ['out', 'Saídas'], ['in', 'Entradas']])}</section>
      <section class="fsec"><div class="fh"><h3>Pessoa</h3></div><div class="row-pills" role="radiogroup">${SCOPES.map(s => `<button class="spill" role="radio" data-fperson="${s}" aria-checked="${d.person === s}">${s}</button>`).join('')}</div></section>
      <section class="fsec"><div class="fh"><h3>Categorias</h3><span id="fcatn">${d.cats.length ? plural(d.cats.length, 'escolhida', 'escolhidas') : 'Todas'}</span></div>
        <div class="chips" id="fcats" role="group" aria-label="Categorias">${catsHTML(d)}</div>
        <button class="morecats" data-act="f-morecats" aria-expanded="${moreCats}">${moreCats ? 'Mostrar menos' : `Ver todas · ${catOrder.length}`}<i class="ph ph-caret-down"></i></button></section>
      <button class="advt" data-act="f-adv" aria-expanded="${advOpen}"><span class="t"><b>${advOpen ? 'Menos filtros' : 'Mais filtros'}${advCount(d) && !advOpen ? ` · ${advCount(d)} ativo${advCount(d) > 1 ? 's' : ''}` : ''}</b><span>Contas e cartões, valor, status, transferências</span></span><i class="ph ph-caret-down"></i></button>
      <div class="adv" id="fadv"${advOpen ? '' : ' hidden'}>
        <section class="fsec" style="padding-top:4px"><div class="fh"><h3>Contas e cartões</h3><span>${d.accs.length ? plural(d.accs.length, 'escolhida', 'escolhidas') : 'Todas'}</span></div><div id="faccs">${accsHTML(d)}</div></section>
        <section class="fsec"><div class="fh"><h3>Valor</h3><span>em reais, sem sinal</span></div><div class="range">
          <label>Mínimo<span class="cf"><span>R$</span><input inputmode="decimal" data-fmin placeholder="0" value="${d.min ?? ''}"></span></label>
          <label>Máximo<span class="cf"><span>R$</span><input inputmode="decimal" data-fmax placeholder="sem limite" value="${d.max ?? ''}"></span></label></div></section>
        <section class="fsec"><div class="fh"><h3>Status</h3></div>${segHTML('fs', d.status, [['all', 'Todas'], ['pending', 'Pendentes'], ['posted', 'Concluídas']])}</section>
        <section class="fsec"><button class="trow" role="switch" data-act="f-transfers" aria-checked="${d.transfers}"><span class="t"><b>Mostrar transferências entre vocês</b><span>Pix entre Marina e Rafael</span></span><span class="sw"><i></i></span></button>
          <p class="expl">Dinheiro que só troca de conta dentro da casa não é gasto nem renda. Mesmo quando aparece na lista, fica fora de saídas e entradas. Pagamentos de fatura também ficam fora: as compras do cartão já foram contadas.</p></section>
      </div>
    </div>
    <div class="fs-foot"><button class="btn2" data-act="f-clear">Limpar</button><button class="btn1" data-act="f-apply"></button></div>`;
}
function refreshDraft({ cats = true, accs = true, cal = true } = {}) {
  const L = fLayer, d = state.draft; if (!L || state.view !== 'filters') return;
  L.querySelectorAll('[data-fp]').forEach(b => b.setAttribute('aria-checked', b.dataset.fp === 'custom' ? String(customOn || d.period.startsWith('range:')) : String(!(customOn || d.period.startsWith('range:')) && d.period === b.dataset.fp)));
  L.querySelectorAll('[data-ft]').forEach(b => b.setAttribute('aria-checked', b.dataset.ft === d.type));
  L.querySelectorAll('[data-fs]').forEach(b => b.setAttribute('aria-checked', b.dataset.fs === d.status));
  L.querySelectorAll('[data-fperson]').forEach(b => b.setAttribute('aria-checked', b.dataset.fperson === d.person));
  L.querySelector('[data-act="f-transfers"]').setAttribute('aria-checked', d.transfers);
  L.querySelectorAll('.seg').forEach(s => placeThumb(s, 'button', '.sthumb'));
  if (cats) { L.querySelector('#fcats').innerHTML = catsHTML(d); L.querySelector('#fcatn').textContent = d.cats.length ? plural(d.cats.length, 'escolhida', 'escolhidas') : 'Todas'; }
  if (accs) L.querySelector('#faccs').innerHTML = accsHTML(d);
  if (cal) L.querySelector('#fcal').innerHTML = calHTML(d);
  const n = draftCount(), btn = L.querySelector('[data-act="f-apply"]');
  btn.disabled = !n; btn.textContent = n ? `Mostrar ${plural(n, 'transação', 'transações')}` : 'Nenhuma transação';
  L.querySelector('[data-act="f-clear"]').disabled = sameF(d, { ...DEFAULT_F, period: d.period }) && !d.cats.length;
}
function openFilters() {
  if (state.view === 'search') exitSearch();
  if (state.view !== 'list') return;
  state.view = 'filters';
  state.draft = { ...clone(state.f), person: state.scope };
  advOpen = advCount(state.f) > 0; moreCats = false; customOn = false;
  calKey = state.f.period.startsWith('range:') ? state.f.period.slice(6, 13) : TODAY.slice(0, 7);
  const base = TX.filter(t => passes(t, { ...DEFAULT_F, period: state.f.period }, state.scope, ''));
  catOrder = PICKABLE.slice().sort((a, b) => base.filter(t => t.cat === b).length - base.filter(t => t.cat === a).length);
  const h = advOpen || state.f.period.startsWith('range:') ? LARGE : MED;
  const L = fLayer = dock.makeLayer(filtersHTML(), 'bottom fs'); L.style.height = h + 'px';
  scrimEl.classList.add('on');
  dock.morph({ to: sheet(h), next: L, omega: OMEGA.open, end: () => L.querySelector('[data-act="panel-close"]').focus({ preventScroll: true }) });
  refreshDraft({ cats: false, accs: false, cal: false });
  requestAnimationFrame(() => L.querySelectorAll('.seg').forEach(s => placeThumb(s, 'button', '.sthumb', true)));
}
function sizeSheet(h) {
  const L = fLayer; if (!L || Math.abs(dock.cur.h - h) < 1 && !dock.run) return;
  L.style.height = Math.max(h, dock.cur.h) + 'px';
  dock.morph({ to: sheet(h), omega: OMEGA.sheet, end: () => { L.style.height = h + 'px'; } });
}
function closePanel(apply = false) {
  if (state.view !== 'filters' && state.view !== 'summary') return;
  const was = state.view;
  if (apply && was === 'filters') {
    const { person, ...f } = state.draft;
    state.f = f;
    if (person !== state.scope) { state.scope = person; const box = $('scopePills'); box.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-checked', p.dataset.scope === person)); placeThumb(box, '.pill', '.thumb'); }
    refresh(); // a lista troca por baixo da folha que recolhe
  }
  state.view = 'list'; state.draft = null; fLayer = null;
  scrimEl.classList.remove('on'); $('homeind').classList.remove('light');
  const L = dock.makeLayer(dockHTML(), 'bottom');
  dock.morph({ to: DOCK, next: L, omega: OMEGA.close, end: () => L.querySelector(`[data-act="${was}"]`)?.focus({ preventScroll: true }) });
}

/* ---------- Resumo: a mesma cápsula escura vira o mostrador ---------- */
function summaryHTML() {
  const s = summarize(visible()), f = state.f, parts = ctxParts(f, state.q);
  const ctx = `${state.scope} · ${periodLabel(f.period)}${parts.length ? ` · ${plural(parts.length, 'filtro', 'filtros')}` : ''}`;
  const res = s.in - s.out;
  let hero;
  if (f.type === 'out') hero = `<div class="lbl">Saídas no período</div>${amtHTML(s.out, { share: 'sum' })}<div class="cap">${plural(s.nOut, 'saída', 'saídas')} · filtro “Saídas” ativo</div>`;
  else if (f.type === 'in') hero = `<div class="lbl">Entradas no período</div>${amtHTML(s.in, { share: 'sum' })}<div class="cap">${plural(s.nIn, 'entrada', 'entradas')} · filtro “Entradas” ativo</div>`;
  else hero = `<div class="lbl">Resultado do período</div>${amtHTML(res, { sign: true, share: 'sum' })}<div class="cap">${res >= 0 ? 'Entradas menos saídas' : `Saídas passaram as entradas em ${brl(res)}`} · ${plural(s.nIn + s.nOut, 'transação', 'transações')}</div>`;
  const col = (k, lbl, v, n, word) => `<button class="sm-col" data-act="only-${k}"${f.type !== 'all' ? ' disabled' : ''} aria-label="Ver só ${lbl.toLowerCase()}"><span class="lbl">${lbl}${f.type === 'all' ? '<i class="ph ph-caret-right"></i>' : ''}</span>${amtHTML(v, { cls: 'md' })}<span class="cap">${plural(n, word, word + 's')}</span></button>`;
  const share = s.in ? s.out / s.in : 0;
  const bar = f.type === 'all' ? (s.in ? `<div class="sm-bar"><div class="track${share > 1 ? ' over' : ''}"><i style="width:${Math.min(100, share * 100).toFixed(1)}%"></i></div><div class="cap">Saídas usaram ${Math.round(share * 100)}% das entradas</div></div>` : `<div class="sm-bar"><div class="cap">Sem entradas neste recorte</div></div>`) : '';
  const notes = [];
  if (s.nPend) notes.push(`<div><i class="ph ph-clock"></i>Inclui ${plural(s.nPend, 'pendente', 'pendentes')} (${brl(s.pend)}), que o banco ainda vai confirmar.</div>`);
  if (s.nTr || s.nInv) notes.push(`<div><i class="ph ph-arrows-left-right"></i>Fora das somas: ${[s.nTr ? plural(s.nTr, 'transferência entre vocês', 'transferências entre vocês') : '', s.nInv ? `${plural(s.nInv, 'pagamento de fatura', 'pagamentos de fatura')} (${brl(s.inv)})` : ''].filter(Boolean).join(' e ')}.</div>`);
  return `<div class="sm"><div class="sm-top" data-drag><div class="sm-ctx">${ctx}</div><button class="ib dk" data-act="panel-close" aria-label="Fechar resumo"><i class="ph ph-x"></i></button></div>
    <div class="sm-hero">${hero}</div>
    ${f.type === 'all' ? `<div class="sm-cols">${col('out', 'Saídas', s.out, s.nOut, 'saída')}${col('in', 'Entradas', s.in, s.nIn, 'entrada')}</div>` : ''}
    ${bar}${notes.length ? `<div class="sm-notes">${notes.join('')}</div>` : ''}</div>`;
}
function openSummary() {
  if (state.view === 'search') exitSearch();
  if (state.view !== 'list') return;
  state.view = 'summary';
  const L = dock.makeLayer(summaryHTML(), 'bottom');
  const h = L.offsetHeight;
  scrimEl.classList.add('on'); $('homeind').classList.add('light');
  dock.morph({ to: { x: 12, y: 862 - h, w: 378, h, r: 43, c: 0, e: 1, s: 1 }, next: L, omega: OMEGA.open, end: () => L.querySelector('[data-act="panel-close"]').focus({ preventScroll: true }) });
}

/* ---------- Detalhe: a linha tocada vira o modal; fechar volta para a mesma linha ---------- */
function fitModal(L, w = 378) {
  L.classList.remove('scroll'); L.style.height = ''; L.style.width = w + 'px';
  const nat = L.scrollHeight, max = 862 - 62; L.style.width = '';
  const h = Math.min(nat, max);
  if (nat > max) { L.classList.add('scroll'); L.style.height = h + 'px'; }
  return { x: 12, y: 862 - h, w, h, r: 43, c: 1, e: 1, s: 1 };
}
function detailHTML(t) {
  const c = CAT[t.cat], a = ACC[t.accId], pend = t.status === 'pending';
  const dir = t.kind === 'transfer' ? 'Transferência entre vocês' : t.kind === 'invoice' ? 'Pagamento de fatura' : t.amount < 0 ? 'Saída' : 'Entrada';
  const st = pend ? '<span class="sdot p"></span>Pendente · o banco ainda vai confirmar' : '<span class="sdot"></span>Concluída';
  const kv = (k, v, act) => act ? `<button class="kv btn" data-act="${act}" aria-label="${k}: ${v.replace(/<[^>]+>/g, '')}. Alterar"><span class="k1">${k}</span><span class="v1">${v}<i class="ph ph-caret-right"></i></span></button>` : `<div class="kv"><span class="k1">${k}</span><span class="v1">${v}</span></div>`;
  const editable = t.kind === 'regular';
  const sugg = t.cat === 'semcat' ? `<div class="sugg"><span>Parece com:</span>${['mercado', 'delivery', 'compras'].map(s => `<button class="spill" data-pickcat="${s}">${CAT[s].name}</button>`).join('')}</div>` : '';
  const rows = [
    kv('Data', `${longDate(t.date)} · ${t.time}`),
    kv('Categoria', c.name, editable ? 'category' : ''),
    kv('Conta', `${a.name}${a.last4 ? ' •• ' + a.last4 : ''}`),
    kv('Pessoa', `<span class="who" style="color:var(--ink);font-size:14px"><i>${PEOPLE[a.owner].ini}</i>${person(t)}</span>`),
    t.inst ? kv('Parcela', `<span class="vv">${t.inst[0]} de ${t.inst[1]}<small>Total ${brl(t.inst[2])}</small></span>`) : '',
    t.kind !== 'regular' ? kv('Nas somas', t.kind === 'transfer' ? 'Fora · só troca de conta' : 'Fora · as compras já contam') : '',
    kv('Descrição do banco', `<span class="dt-raw">${esc(t.desc)}</span>`),
  ].join('');
  return `<div class="dt"><div class="dt-top" data-drag><span class="ttl" style="font-size:13px;font-weight:500;color:var(--text-3)">${dir}</span><button class="ib" data-act="detail-close" aria-label="Fechar"><i class="ph ph-x"></i></button></div>
    <div class="dt-id"><span class="dot${t.cat === 'semcat' ? ' q' : ''}" data-share="dot"><i class="ph ph-${c.icon}"></i></span><div><div class="dt-name" data-share="name">${esc(t.name)}</div><div class="dt-sub">${c.name} · ${person(t)}</div></div></div>
    <div class="dt-amt">${amtHTML(t.amount, { sign: true, cls: t.amount > 0 && t.kind === 'regular' ? 'in' : '', share: 'amt' })}<div class="dt-st">${st}</div></div>
    <div class="dt-g">${sugg ? `<div style="padding-top:12px">${sugg}</div>` : ''}${rows}</div>
    <p class="dt-note">Veio do ${a.inst} pelo Open Finance. Valor, data e descrição são do banco e não mudam aqui${editable ? '; a categoria é só sua, vale só no Fyin' : ''}.</p></div>`;
}
function categoryHTML(t) {
  return `<div class="dt"><div class="dt-top" data-drag><button class="ib" data-act="detail-back" aria-label="Voltar para a transação"><i class="ph ph-arrow-left"></i></button><span class="ttl">Categoria</span><button class="ib" data-act="detail-close" aria-label="Fechar"><i class="ph ph-x"></i></button></div>
    <p class="dt-note" style="margin:0 20px 8px">Para ${esc(t.name)}. Muda só no Fyin; o banco continua com a dele.</p>
    <div class="ct-list" role="radiogroup">${PICKABLE.filter(c => c !== 'semcat' && (t.amount > 0) === ['salario', 'recebido', 'estorno'].includes(c)).map(c => `<button class="crow" role="radio" data-pickcat="${c}" aria-checked="${t.cat === c}"><span class="dot"><i class="ph ph-${CAT[c].icon}"></i></span><b>${CAT[c].name}</b><i class="ph ph-check"></i></button>`).join('')}</div></div>`;
}
const rowEl = id => listEl.querySelector(`.list-in .tx[data-tx="${id}"]`);
function openDetail(id) {
  if (state.view === 'search') exitSearch();
  if (state.view !== 'list') return;
  const row = rowEl(id); if (!row) return;
  const t = TX_BY_ID[id], r = rel(row);
  state.view = 'detail'; state.detail = id;
  modal.el.innerHTML = '';
  modal.set({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0, c: 1, e: 0, s: 0 });
  modal.layer = modal.makeLayer(`<div class="tx" style="pointer-events:none">${row.innerHTML}</div>`);
  row.style.visibility = 'hidden';
  scrimEl.classList.add('on');
  const L = modal.makeLayer(detailHTML(t));
  modal.morph({ to: fitModal(L), next: L, omega: OMEGA.open, end: () => L.querySelector('[data-act="detail-close"]').focus({ preventScroll: true }) });
}
function closeDetail() {
  if (state.view !== 'detail' && state.view !== 'category') return;
  const id = state.detail, row = rowEl(id);
  state.view = 'list'; scrimEl.classList.remove('on');
  const done = () => { modal.el.style.display = 'none'; modal.el.innerHTML = ''; modal.layer = null; if (row) { row.style.visibility = ''; row.focus({ preventScroll: true }); } syncScrim(); };
  const r = row ? rel(row) : null;
  if (!row || r.y > 874 || r.y + r.h < 0) return modal.morph({ to: { ...modal.cur, y: 874, s: 0, e: 0 }, omega: OMEGA.close, end: done });
  const L = modal.makeLayer(`<div class="tx" style="pointer-events:none">${row.innerHTML}</div>`);
  row.style.visibility = 'hidden';
  modal.morph({ to: { x: r.x, y: r.y, w: r.w, h: r.h, r: 0, c: 1, e: 0, s: 0 }, next: L, omega: OMEGA.close, end: done });
}
function showCategory() {
  state.view = 'category';
  const L = modal.makeLayer(categoryHTML(TX_BY_ID[state.detail]));
  modal.morph({ to: fitModal(L), next: L, omega: OMEGA.open });
}
function backToDetail() {
  state.view = 'detail';
  const L = modal.makeLayer(detailHTML(TX_BY_ID[state.detail]));
  modal.morph({ to: fitModal(L), next: L, omega: OMEGA.back });
}
function pickCategory(c) {
  const t = TX_BY_ID[state.detail], prev = t.cat;
  if (c === prev) return backToDetail();
  t.cat = c;
  renderList(false); renderCtx(); rowEl(t.id) && (rowEl(t.id).style.visibility = 'hidden');
  if (state.view === 'category') backToDetail(); else { const L = modal.makeLayer(detailHTML(t)); modal.morph({ to: fitModal(L), next: L, omega: OMEGA.back }); }
  toast(`Categoria alterada para ${CAT[c].name}`, () => {
    t.cat = prev; renderList(false); renderCtx();
    if (state.detail === t.id && state.view === 'detail') { rowEl(t.id) && (rowEl(t.id).style.visibility = 'hidden'); const L = modal.makeLayer(detailHTML(t)); modal.morph({ to: fitModal(L), next: L, omega: OMEGA.back }); }
  });
}

/* ---------- Período: o gatilho vira o painel; um toque escolhe ---------- */
const trig = $('ptrig');
function periodHTML() {
  const cur = state.f.period, months = ['2026-10', '2026-09', '2026-08', '2026-07'];
  const cnt = p => visible({ ...DEFAULT_F, period: p }, state.scope, '').length;
  const opt = (p, l, sub) => `<button class="opt" role="option" data-period="${p}" aria-selected="${cur === p}"><span class="t"><b>${l}</b><span>${sub}</span></span><i class="ph ph-check"></i></button>`;
  return `<div class="pp"><div class="pp-h" data-act="period-close"><span>${periodLabel(cur)}</span><i class="ph ph-caret-down"></i></div>
    <div role="listbox" aria-label="Período">${months.map((k, i) => opt('month:' + k, `${cap(MES_L[Number(k.slice(5)) - 1])}${i === 0 ? ' · este mês' : ''}`, plural(cnt('month:' + k), 'transação', 'transações'))).join('')}
    <div class="pp-sep"></div>${opt('last30', 'Últimos 30 dias', `${dm(addDays(TODAY, -29))} – hoje`)}
    <button class="opt" data-act="period-custom"><span class="t"><b>Personalizado</b><span>Escolher datas nos filtros</span></span><i class="ph ph-calendar-blank" style="visibility:visible;color:var(--text-2)"></i></button></div></div>`;
}
function openPeriod() {
  if (state.view === 'search') exitSearch();
  if (state.view !== 'list') return;
  state.view = 'period'; trig.setAttribute('aria-expanded', 'true');
  const r = rel(trig);
  pop.el.innerHTML = '';
  pop.set({ x: r.x, y: r.y, w: r.w, h: r.h, r: r.h / 2, c: 1, e: 0, s: 0 });
  pop.layer = pop.makeLayer(`<div class="pp-h" style="height:${r.h}px;justify-content:center;padding:0">${trig.innerHTML}</div>`);
  trig.style.visibility = 'hidden';
  const L = pop.makeLayer(periodHTML()), w = 252;
  const to = fitModal(L, w);
  scrimEl.classList.add('on');
  pop.morph({ to: { x: 402 - 16 - w, y: r.y, w, h: to.h, r: 22, c: 1, e: 0.8, s: 0.2 }, next: L, omega: OMEGA.period });
}
function closePeriod(p) {
  if (state.view !== 'period') return;
  state.view = 'list'; trig.setAttribute('aria-expanded', 'false'); scrimEl.classList.remove('on');
  if (p && p !== state.f.period) { state.f.period = p; refresh(); }
  const r = rel(trig);
  const L = pop.makeLayer(`<div class="pp-h" style="height:${r.h}px;justify-content:center;padding:0">${trig.innerHTML}</div>`);
  pop.morph({ to: { x: r.x, y: r.y, w: r.w, h: r.h, r: r.h / 2, c: 1, e: 0, s: 0 }, next: L, omega: OMEGA.close,
    end: () => { pop.el.style.display = 'none'; pop.el.innerHTML = ''; pop.layer = null; trig.style.visibility = ''; trig.focus({ preventScroll: true }); syncScrim(); } });
}

/* ---------- Toast com Desfazer (DS: reversível = executa + desfazer) ---------- */
let toastT;
function toast(msg, undo) {
  const el = $('toast'); clearTimeout(toastT);
  el.innerHTML = `<i class="ph ph-check"></i><p>${msg}</p>${undo ? '<button data-act="undo">Desfazer</button>' : ''}`;
  el.onclick = e => { if (e.target.closest('[data-act="undo"]')) { undo(); el.classList.remove('on'); } };
  el.classList.add('on'); toastT = setTimeout(() => el.classList.remove('on'), 5000 * SLOW);
}
function clearAll() {
  const prevF = clone(state.f), prevQ = state.q;
  state.f = { ...clone(DEFAULT_F), period: state.f.period }; state.q = '';
  if (qInput()) { qInput().value = ''; dock.el.querySelector('.qclear').hidden = true; }
  refresh();
  toast('Filtros e busca limpos', () => { state.f = prevF; state.q = prevQ; if (qInput()) { qInput().value = prevQ; dock.el.querySelector('.qclear').hidden = !prevQ; } refresh(); });
}

/* ---------- Arrastar: descer fecha; na folha de filtros, subir abre a altura grande ---------- */
let dragging = null, swallow = false;
phone.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-drag]'); if (!h || e.target.closest('button')) return;
  const surf = dock.el.contains(h) ? dock : modal.el.contains(h) ? modal : null; if (!surf) return;
  surf.finish();
  dragging = { surf, y0: e.clientY, base: { ...surf.cur }, dy: 0, v: 0, ly: e.clientY, lt: performance.now() };
  h.setPointerCapture(e.pointerId);
});
phone.addEventListener('pointermove', e => {
  if (!dragging) return;
  const d = dragging, now = performance.now();
  const scale = phone.getBoundingClientRect().width / 402;
  d.dy = (e.clientY - d.y0) / scale; d.v = (e.clientY - d.ly) / (Math.max(1, now - d.lt) * scale); d.ly = e.clientY; d.lt = now;
  if (Math.abs(d.dy) > 4) swallow = true;
  const grow = state.view === 'filters' && d.dy < 0;
  let r;
  if (d.dy >= 0) r = { ...d.base, y: d.base.y + d.dy };
  else if (grow) { const hh = Math.min(LARGE + 20, d.base.h - d.dy); r = { ...d.base, y: 862 - hh, h: hh }; d.surf.layer.style.height = Math.max(hh, parseFloat(d.surf.layer.style.height) || 0) + 'px'; }
  else r = { ...d.base, y: d.base.y + d.dy * 0.15 };
  d.surf.cur = r; d.surf.apply(r);
});
phone.addEventListener('pointerup', () => {
  if (!dragging) return;
  const d = dragging; dragging = null;
  setTimeout(() => { swallow = false; });
  const closing = d.dy > 120 || d.v > 0.8;
  if (state.view === 'filters') {
    if (d.dy < -60 || d.v < -0.6) return sizeSheet(LARGE);
    if (d.base.h > MED + 1 && d.dy > 80 && d.dy < 260 && d.v < 1.2) return sizeSheet(MED);
    if (closing) return closePanel(false);
    return sizeSheet(d.base.h);
  }
  if (closing) return d.surf === dock ? closePanel(false) : closeDetail();
  d.surf.morph({ to: d.base, omega: OMEGA.back });
});

/* ---------- Eventos ---------- */
phone.addEventListener('click', e => {
  if (swallow) { e.preventDefault(); return; }
  if (e.target.closest('.well') && !e.target.closest('[data-act]') && state.view === 'list') enterSearch();
  const t = e.target.closest('[data-act],[data-scope],[data-tx],[data-fp],[data-ft],[data-fs],[data-fperson],[data-fc],[data-fa],[data-cd],[data-period],[data-pickcat]');
  if (!t || t.getAttribute('aria-disabled') === 'true' || t.disabled) return;
  const a = t.dataset.act, d = state.draft;
  if (t.dataset.scope) return setScope(t.dataset.scope);
  if (t.dataset.tx) return openDetail(t.dataset.tx);
  if (t.dataset.period) return closePeriod(t.dataset.period);
  if (t.dataset.pickcat) return pickCategory(t.dataset.pickcat);
  if (d) {
    if (t.dataset.fp) {
      if (t.dataset.fp === 'custom') { customOn = true; state.calPick = 'start'; refreshDraft({ cats: false, accs: false }); sizeSheet(LARGE); setTimeout(() => fLayer?.querySelector('#fcal')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300 * SLOW); return; }
      customOn = false; d.period = t.dataset.fp; return refreshDraft();
    }
    if (t.dataset.ft) { d.type = t.dataset.ft; return refreshDraft({ accs: false, cal: false }); }
    if (t.dataset.fs) { d.status = t.dataset.fs; return refreshDraft({ accs: false, cal: false }); }
    if (t.dataset.fperson) { d.person = t.dataset.fperson; if (d.person !== 'Casa') d.accs = d.accs.filter(x => PEOPLE[ACC[x].owner].name === d.person); return refreshDraft({ cal: false }); }
    if (t.dataset.fc) { const c = t.dataset.fc; d.cats = d.cats.includes(c) ? d.cats.filter(x => x !== c) : [...d.cats, c]; return refreshDraft({ accs: false, cal: false }); }
    if (t.dataset.fa) { const x = t.dataset.fa; d.accs = d.accs.includes(x) ? d.accs.filter(y => y !== x) : [...d.accs, x]; return refreshDraft({ cal: false }); }
    if (t.dataset.cd) {
      const s = t.dataset.cd, [a0] = d.period.startsWith('range:') ? periodRange(d.period) : [null];
      if (state.calPick === 'end' && a0 && s >= a0) { d.period = `range:${a0}:${s}`; state.calPick = 'start'; }
      else { d.period = `range:${s}:${s}`; state.calPick = 'end'; }
      customOn = true; return refreshDraft({ accs: false });
    }
  }
  switch (a) {
    case 'filters': return openFilters();
    case 'summary': return openSummary();
    case 'panel-close': return closePanel(false);
    case 'f-apply': return closePanel(true);
    case 'f-clear': { const p = d.person; state.draft = { ...clone(DEFAULT_F), period: d.period, person: p }; customOn = false; return refreshDraft(); }
    case 'f-adv': { advOpen = !advOpen; const b = fLayer.querySelector('#fbody'); fLayer.querySelector('#fadv').hidden = !advOpen;
      t.setAttribute('aria-expanded', advOpen); t.querySelector('b').textContent = advOpen ? 'Menos filtros' : 'Mais filtros' + (advCount(d) ? ` · ${advCount(d)} ativo${advCount(d) > 1 ? 's' : ''}` : '');
      if (advOpen) { sizeSheet(LARGE); requestAnimationFrame(() => { fLayer.querySelectorAll('.seg').forEach(s => placeThumb(s, 'button', '.sthumb', true)); setTimeout(() => b.scrollTo({ top: t.offsetTop - 12, behavior: REDUCE ? 'auto' : 'smooth' }), 120 * SLOW); }); }
      return; }
    case 'f-morecats': moreCats = !moreCats; t.setAttribute('aria-expanded', moreCats); t.firstChild.textContent = moreCats ? 'Mostrar menos' : `Ver todas · ${catOrder.length}`; return refreshDraft({ accs: false, cal: false });
    case 'f-transfers': d.transfers = !d.transfers; return refreshDraft({ cats: false, accs: false, cal: false });
    case 'cal-prev': case 'cal-next': { const [y, m] = calKey.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1 + (a === 'cal-next' ? 1 : -1), 1)); calKey = dt.toISOString().slice(0, 7); return refreshDraft({ cats: false, accs: false }); }
    case 'only-out': case 'only-in': state.f.type = a === 'only-out' ? 'out' : 'in'; renderDockBadge(); return closePanel(false), refresh();
    case 'q-clear': e.preventDefault(); qInput().value = ''; onQuery(''); if (state.view === 'list') refresh({ top: false }); return;
    case 'kb-hide': return exitSearch();
    case 'search-focus': return qInput().focus();
    case 'clear-all': return clearAll();
    case 'scope-casa': return setScope('Casa');
    case 'detail-close': return closeDetail();
    case 'category': return showCategory();
    case 'detail-back': return backToDetail();
    case 'period': return state.view === 'period' ? closePeriod() : openPeriod();
    case 'period-close': return closePeriod();
    case 'period-custom': closePeriod(); return setTimeout(() => { openFilters(); customOn = true; state.calPick = 'start'; refreshDraft({ cats: false, accs: false }); sizeSheet(LARGE); }, INSTANT ? 0 : 260 * SLOW);
    case 'retry': t.disabled = true; t.textContent = 'Tentando…'; return setTimeout(() => { state.error = false; renderList(true); toast('Tudo atualizado'); }, 900 * SLOW);
    case 'back': return toast('Voltar leva ao Início');
  }
});
phone.addEventListener('input', e => {
  if (e.target.id === 'q') return onQuery(e.target.value);
  const d = state.draft; if (!d) return;
  const v = e.target.value.trim() === '' ? null : Number(e.target.value.replace(/\./g, '').replace(',', '.'));
  if (e.target.matches('[data-fmin]')) d.min = Number.isFinite(v) ? v : null;
  if (e.target.matches('[data-fmax]')) d.max = Number.isFinite(v) ? v : null;
  refreshDraft({ accs: false, cal: false });
});
phone.addEventListener('focusin', e => { if (e.target.id === 'q') enterSearch(); });
phone.addEventListener('keydown', e => { if (e.target.id === 'q' && e.key === 'Enter') exitSearch(); });
scrimEl.addEventListener('click', () => {
  if (state.view === 'period') closePeriod();
  else if (state.view === 'detail' || state.view === 'category') closeDetail();
  else closePanel(false);
});
// Rolar a lista com o teclado aberto recolhe o teclado e mantém a busca.
scroller.addEventListener('pointerdown', () => { if (state.view === 'search') exitSearch(); });
scroller.addEventListener('wheel', () => { if (state.view === 'search') exitSearch(); }, { passive: true });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ({ period: closePeriod, detail: closeDetail, category: backToDetail, filters: () => closePanel(false), summary: () => closePanel(false), search: exitSearch })[state.view]?.();
});

/* ---------- Início e atalhos de revisão (?state=…) ---------- */
renderScope(); renderHeader(); renderList(); mountDock();
const S = params.get('state');
if (S) {
  INSTANT = true;
  const tx = name => TX.find(t => t.name === name && t.date.startsWith('2026-10'));
  const applied = () => { state.f = { ...state.f, type: 'out', cats: ['mercado', 'delivery'] }; refresh(); };
  const steps = {
    marina: () => setScope('Marina'),
    search: () => enterSearch(),
    'search-q': () => { enterSearch(); qInput().value = 'merc'; onQuery('merc'); },
    filters: () => openFilters(),
    'filters-adv': () => { applied(); state.f.accs = ['nu-cc']; state.f.status = 'posted'; refresh(); openFilters(); },
    applied,
    summary: () => openSummary(),
    'summary-marina': () => { setScope('Marina'); openSummary(); },
    detail: () => openDetail(tx('Amazon').id),
    'detail-pend': () => openDetail(tx('Pão de Açúcar').id),
    category: () => { openDetail(tx('PIX QRS 4892 MERCPAGO').id); showCategory(); },
    'detail-semcat': () => openDetail(tx('PIX QRS 4892 MERCPAGO').id),
    empty: () => { setScope('Marina'); state.q = 'padaria'; mountDock(); refresh(); },
    loading: () => { state.loading = true; renderHeader(); renderList(); },
    error: () => { state.error = true; renderList(); },
    period: () => openPeriod(),
    toast: () => toast('Categoria alterada para Delivery', () => {}),
  };
  if (S === 'detail-semcat' || S === 'category') scroller.scrollTop = 900;
  steps[S]?.();
  if (S === 'detail-semcat' || S === 'category') scroller.scrollTop = scroller.scrollTop;
  INSTANT = false;
}
