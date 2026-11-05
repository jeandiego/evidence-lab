/* Contas · protótipo navegável do quadro 21. Usa o motor de ../transacoes/engine.js (Surface, tween, formatação). */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const days = (a, b) => Math.round((dobj(b) - dobj(a)) / 864e5);
const wdShort = s => WD[dobj(s).getUTCDay()].slice(0, 3);
const money = v => 'R$ ' + nf.format(v);
const sum = list => list.reduce((s, b) => s + b.amount, 0);
const later = ms => new Promise(r => setTimeout(r, ms * SLOW));

const DEFAULT_F = { types: [], rec: 'all', src: 'all' };
const S = { tab: 'open', later: false, q: '', f: clone(DEFAULT_F), view: 'list', detail: null, draft: null, fail: false, offline: false, remote: false, load: 'ok', queue: [], fresh: null };
let bills = clone(BILLS);
const byId = id => bills.find(b => b.id === id);
const $list = $('list'), scroller = $('scroller'), dockEl = $('dock'), qIn = $('q');
const modal = new Surface($('modal'));
const DOCK = { x: 12, y: 790, w: 378, h: 56, r: 28, c: 0, e: 0.45, s: 0 };

/* ---------- Regras ---------- */
function bucket(b) { const d = days(TODAY, b.due); return d < 0 ? 'over' : d === 0 ? 'today' : d <= 7 ? 'week' : 'later'; }
const GROUPS = [['over', 'Vencidas'], ['today', 'Hoje'], ['week', 'Próximos 7 dias'], ['later', 'Depois']];
const groupName = b => GROUPS.find(g => g[0] === bucket(b))[1];
function metaOpen(b) {
  const d = days(TODAY, b.due);
  if (d < 0) return `Venceu há ${plural(-d, 'dia', 'dias')}`;
  if (d === 0) return 'Vence hoje' + (b.debit ? ' · débito agendado' : b.rec ? ' · recorrente' : '');
  if (d <= 7) return `Vence em ${plural(d, 'dia', 'dias')} · ` + (b.type === 'fatura' ? 'cartão' : `${wdShort(b.due)}, ${dm(b.due)}`);
  return dm(b.due) + (b.rec ? (b.type === 'variavel' ? ' · varia todo mês' : ' · recorrente') : '');
}
const whenPaid = b => b.paidAt === TODAY ? 'hoje' : b.paidAt === addDays(TODAY, -1) ? 'ontem' : `em ${dm(b.paidAt)}`;
const who = n => n === ME ? 'você' : n;
function metaPaid(b) {
  if (b.queued) return 'Neste iPhone · salva ao reconectar';
  return `Paga ${whenPaid(b)} · ${who(b.by)}` + (b.recon === 'review' ? ' · revisar no extrato' : '');
}
function passes(b, f = S.f, q = S.q) {
  if (f.types.length && !f.types.includes(b.type)) return false;
  if (f.rec === 'rec' && !b.rec) return false;
  if (f.rec === 'one' && b.rec) return false;
  if (f.src !== 'all' && b.src !== f.src) return false;
  const n = norm(q.trim());
  return !n || norm(b.name).includes(n) || norm(b.cat || '').includes(n);
}
const isPaid = b => b.status === 'paid';
const openList = (f, q) => bills.filter(b => !isPaid(b) && passes(b, f, q)).sort((a, b) => a.due.localeCompare(b.due) || b.amount - a.amount);
const paidList = (f, q) => bills.filter(b => isPaid(b) && passes(b, f, q)).sort((a, b) => (b.paidAt + b.paidTime).localeCompare(a.paidAt + a.paidTime));
const fCount = f => (f.types.length ? 1 : 0) + (f.rec !== 'all' ? 1 : 0) + (f.src !== 'all' ? 1 : 0);

/* ---------- Resumo ---------- */
let lastTotal = null;
function amtSplit(v) { const [m, c] = nf.format(v).split(','); return `<span class="cur">R$</span><span class="main">${m}</span><span class="cents">,${c}</span>`; }
function renderSummary() {
  const el = $('sumry');
  if (S.load !== 'ok' || !bills.length || S.q.trim()) { el.hidden = true; return; }
  el.hidden = false;
  const filt = fCount(S.f) > 0, open = openList(S.f, ''), paid = paidList(S.f, '');
  let total, lbl, facts;
  if (S.tab === 'open') {
    total = sum(open);
    lbl = filt ? `a pagar · filtrado · ${plural(open.length, 'conta', 'contas')}` : `a pagar em novembro · ${plural(open.length, 'conta', 'contas')}`;
    const over = open.filter(b => bucket(b) === 'over'), soon = open.filter(b => ['today', 'week'].includes(bucket(b)));
    facts = (over.length ? `<span class="fact attn"><i></i>${plural(over.length, 'vencida', 'vencidas')} · ${money(sum(over))}</span>` : `<span class="fact ok"><i></i>Nada vencido</span>`) +
      `<span class="fact">Até 7 dias · ${money(sum(soon))}</span>`;
  } else {
    total = sum(paid);
    const q = paid.filter(b => b.queued).length;
    lbl = `pago em novembro · ${plural(paid.length, 'conta', 'contas')}${q ? ` · ${q} na fila` : ''}`;
    facts = S.offline ? `<span class="fact">Sem conexão desde 9:39</span>` : `<span class="fact">Ainda a pagar · ${money(sum(open))}</span>`;
  }
  const tick = lastTotal !== null && lastTotal !== total && !REDUCE;
  lastTotal = total;
  el.innerHTML = `<div class="s-l1"><div class="s-amt${tick ? ' tick' : ''}">${amtSplit(total)}</div><span class="s-lbl">${lbl}</span></div><div class="facts">${facts}</div>`;
}

/* ---------- Lista ---------- */
function rowHTML(b) {
  const paid = isPaid(b), meta = paid ? metaPaid(b) : metaOpen(b);
  const mcls = !paid && bucket(b) === 'over' ? ' attn' : paid && (b.queued || b.recon === 'review') ? ' note' : '';
  return `<div class="bill${S.fresh === b.id ? ' new' : ''}" data-id="${b.id}">
    <button class="bbody" data-open="${b.id}" aria-label="${esc(b.name)}, ${money(b.amount)}, ${esc(meta)}">
      <span class="dot" data-share="dot"><i class="ph ph-${b.icon}"></i></span>
      <span class="tx-t"><span class="tx-n" data-share="name">${esc(b.name)}</span><span class="tx-m${mcls}">${esc(meta)}</span></span>
      <span class="tx-v" data-share="amt">${money(b.amount)}</span></button>
    <button class="ring${b.queued ? ' queued' : ''}" role="checkbox" data-ring="${b.id}" aria-checked="${paid && !b.queued}" aria-label="${paid ? `Desmarcar ${esc(b.name)}` : `Marcar ${esc(b.name)} como paga`}"><span><i class="ph-bold ph-check"></i></span></button></div>`;
}
const head = (t, total, cls = '') => `<div class="ghead ${cls}"><span class="d">${t}</span><span class="t">${money(total)}</span></div>`;
function emptyHTML(icon, title, body, act, label) {
  return `<div class="empty"><span class="dot"><i class="ph ph-${icon}"></i></span><div><h2>${title}</h2><p>${body}</p></div><div class="acts"><button class="btn2" data-act="${act}">${label}</button></div></div>`;
}
const skeleton = () => [0, 1].map(() => `<div class="ghead"><span class="sk" style="width:84px;height:12px"></span></div>` +
  [96, 72, 120].map(w => `<div class="skrow"><span class="sk c"></span><span style="flex:1;display:flex;flex-direction:column;gap:8px"><span class="sk" style="width:${w + 40}px;height:12px"></span><span class="sk" style="width:${w}px;height:10px"></span></span><span class="sk" style="width:64px;height:12px"></span></div>`).join('')).join('');
function listHTML() {
  if (S.load === 'loading') return skeleton();
  if (S.load === 'error') return `<div class="empty"><div><p style="margin:0 0 10px;font-size:13px;color:var(--text-3)">Contas de novembro</p><h2>Não carregou agora</h2><p>O Fyin não respondeu. Período e filtros continuam como você deixou; nenhuma conta foi alterada.</p></div><div class="acts"><button class="btn1" data-act="reload"><i class="ph ph-arrows-clockwise"></i>Tentar de novo</button></div></div>`;
  if (!bills.length) return emptyHTML('receipt', 'Nenhuma conta em novembro', 'Cadastre aluguel, condomínio, escola ou qualquer conta com vencimento. As faturas dos cartões conectados entram sozinhas.', 'add', 'Adicionar conta');
  const q = S.q.trim(), filt = fCount(S.f) > 0;
  if (S.tab === 'open') {
    const rows = openList(S.f, S.q);
    if (!rows.length) {
      if (!q && !filt) return emptyHTML('check-circle', 'Tudo pago em novembro', `As ${bills.length} contas do mês estão pagas. A próxima é ${NEXT_BILL}.`, 'tab-paid', 'Ver pagas');
      const inPaid = paidList(S.f, S.q).length;
      return emptyHTML('magnifying-glass', q ? `Nada com “${esc(q)}” em A pagar` : 'Nenhuma conta a pagar com esses filtros',
        `Buscamos nas contas a pagar de novembro${q ? ', por nome e descrição' : ''}.${inPaid ? ` ${plural(inPaid, 'conta paga combina', 'contas pagas combinam')}.` : ''}`,
        inPaid ? 'tab-paid' : 'clear-all', inPaid ? 'Ver em Pagas' : q && !filt ? 'Limpar busca' : 'Limpar filtros');
    }
    let html = '';
    for (const [k, t] of GROUPS) {
      const g = rows.filter(b => bucket(b) === k); if (!g.length) continue;
      if (k === 'later') {
        const open = S.later || !!q;
        const ds = g.map(b => Number(b.due.slice(8)));
        const range = ds.length > 1 ? `${Math.min(...ds)} a ${Math.max(...ds)} nov` : dm(g[0].due);
        html += `<button class="later" data-act="later" aria-expanded="${open}"><span class="t"><b>Depois</b><span>${plural(g.length, 'conta', 'contas')} · ${q ? 'aberto pela busca' : range}</span></span><span class="v">${money(sum(g))}</span><span class="car"><i class="ph ph-caret-down"></i></span></button>
          <div class="lbody${open ? ' open' : ''}" id="lbody"><div>${g.map(rowHTML).join('')}</div></div>`;
      } else html += head(t, sum(g), k === 'over' ? 'attn' : '') + g.map(rowHTML).join('');
    }
    return html;
  }
  const rows = paidList(S.f, S.q);
  if (!rows.length) return emptyHTML('magnifying-glass', q ? `Nada com “${esc(q)}” em Pagas` : 'Nenhuma conta paga ainda', q ? 'Buscamos nas contas pagas de novembro, por nome e descrição.' : 'Quando você marcar uma conta, ela aparece aqui.', q ? 'clear-all' : 'tab-open', q ? 'Limpar busca' : 'Ver A pagar');
  const by = new Map(); for (const b of rows) { if (!by.has(b.paidAt)) by.set(b.paidAt, []); by.get(b.paidAt).push(b); }
  return [...by].map(([d, g]) => head(dayLabel(d), sum(g), 'mute') + g.map(rowHTML).join('')).join('');
}
function renderCtx() {
  const ctx = $('ctx'), q = S.q.trim(), n = fCount(S.f);
  ctx.hidden = !(q || n) || S.load !== 'ok';
  if (!ctx.hidden) {
    const parts = [];
    if (q) parts.push(`“${esc(q)}” em ${S.tab === 'open' ? 'A pagar' : 'Pagas'}`);
    if (S.f.rec !== 'all') parts.push(S.f.rec === 'rec' ? 'Recorrentes' : 'Avulsas');
    if (S.f.types.length) parts.push(S.f.types.map(t => TYPE[t].split(' ')[0]).join(', '));
    if (S.f.src !== 'all') parts.push(S.f.src === 'manual' ? 'Manual' : 'Integração');
    const list = S.tab === 'open' ? openList : paidList;
    ctx.innerHTML = `<span class="ctx-t"><b>${list(S.f, S.q).length}</b> de ${list(DEFAULT_F, '').length} · ${parts.join(' · ')}</span><button class="ctx-x" data-act="clear-all">Limpar</button>`;
  }
  document.documentElement.style.setProperty('--scopeH', $('scope').offsetHeight + 'px');
  const badge = dockEl.querySelector('.badge'); badge.hidden = !n; badge.textContent = n || '';
}
function render({ enter = null, fade = false } = {}) {
  renderSummary(); renderCtx();
  $list.innerHTML = listHTML();
  $('listfoot').innerHTML = S.load !== 'ok' || !bills.length ? '' : `<div class="status"><i class="ph ph-${S.offline ? 'wifi-slash' : 'arrows-clockwise'}"></i>${S.offline ? 'Sem conexão · valores de hoje, 9:38' : 'Atualizado hoje, 9:38 · Itaú, Nubank e Inter'}</div>`;
  $('listfoot').style.paddingBottom = '112px';
  if (enter) { const r = rowEl(enter); if (r && !REDUCE) r.classList.add('enter'); }
  if (fade && !REDUCE) $list.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240 * SLOW, easing: 'cubic-bezier(0.2,0,0,1)' });
  if (S.fresh) { const f = S.fresh; S.fresh = null; setTimeout(() => rowEl(f)?.classList.remove('new'), 60); }
  placeThumb($('segTabs'));
}
const rowEl = id => $list.querySelector(`.bill[data-id="${id}"]`);
function placeThumb(box, jump) {
  const on = box.querySelector('[aria-checked="true"]'), th = box.querySelector('.sthumb'); if (!on || !th) return;
  if (jump) th.style.transition = 'none';
  th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft - 4}px)`; th.style.left = '4px';
  if (jump) { th.offsetWidth; th.style.transition = ''; }
}
function setTab(t) {
  if (S.tab === t) return;
  S.tab = t; S.later = false; lastTotal = null;
  $('segTabs').querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-checked', b.dataset.tab === t));
  render({ fade: true });
}

/* ---------- Toast (quadro 19): base = ação direta, topo = evento automático ---------- */
const toastT = {};
function toast({ msg, desc, icon = 'check', cls = '', action, onAction, ms, pos = 'bottom' }) {
  const box = $('toasts'); box.querySelector(`.tst.${pos}`)?.remove(); clearTimeout(toastT[pos]);
  const el = document.createElement('div');
  el.className = `tst ${pos} ${cls}`; el.setAttribute('role', 'status');
  el.innerHTML = `<i class="ph ph-${icon}"></i><div class="m"><p>${msg}</p>${desc ? `<small>${desc}</small>` : ''}</div>${action ? `<button>${action}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { hide(); onAction(); };
  box.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  const hide = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); };
  toastT[pos] = setTimeout(hide, (ms || (action ? 5000 : desc ? 6000 : 3000)) * SLOW);
}
const log = t => { $('simlog').textContent = t; };

/* ---------- Marcar e desmarcar: otimista, mas só fica “salvo” quando salvou ---------- */
let seq = 0;
function save() {
  const fail = S.fail;
  if (fail) { S.fail = false; $('simFail').checked = false; }
  return new Promise((ok, no) => setTimeout(() => (fail ? no() : ok()), (fail ? 1400 : 700) * SLOW));
}
function apply(b, paid, by = ME) {
  if (paid) Object.assign(b, { status: 'paid', paidAt: TODAY, paidTime: NOW, by, payer: null, recon: 'waiting' });
  else { b.status = 'open'; for (const k of ['paidAt', 'paidTime', 'by', 'payer', 'recon', 'tx', 'queued', 'already']) delete b[k]; }
}
function restore(b, prev) { for (const k of Object.keys(b)) delete b[k]; Object.assign(b, prev); }
// A linha sai do segmento atual: anel completa (160ms), linha recolhe (240ms), depois a lista se recompõe.
function leaveThen(id, fn) {
  const r = rowEl(id);
  if (!r || REDUCE || INSTANT) return fn();
  const ring = r.querySelector('.ring');
  setTimeout(() => { r.classList.add('leave'); setTimeout(fn, 240 * SLOW); }, 160 * SLOW);
  return ring;
}
function commit(id, paid, { fromDetail = false } = {}) {
  const b = byId(id); if (!b) return;
  if (paid && id === 'net' && S.remote && !isPaid(b)) return already(b);
  const prev = clone(b), short = b.name.split(' · ')[0], key = ++seq;
  const ring = rowEl(id)?.querySelector('.ring'); if (ring) ring.setAttribute('aria-checked', paid);
  apply(b, paid);
  if (S.offline) {
    if (paid) b.queued = true;
    S.queue.push({ id, key });
    leaveThen(id, () => render());
    if (fromDetail) refreshDetail();
    toast({ msg: paid ? 'Marcada neste iPhone' : 'Desmarcada neste iPhone', desc: 'Salva quando a conexão voltar.', icon: 'cloud-slash', cls: 'off', action: 'Desfazer', onAction: () => { restore(b, prev); S.queue = S.queue.filter(x => x.key !== key); render({ enter: id }); } });
    log(`Na fila deste iPhone (chave #${key}). Desligue “Sem conexão” para enviar.`);
    return;
  }
  leaveThen(id, () => render());
  if (fromDetail) refreshDetail();
  toast({ msg: paid ? `${short} marcada como paga` : `${short} voltou para A pagar`, action: 'Desfazer', onAction: () => commit(id, !paid) });
  log(`Salvando (chave #${key})…`);
  save().then(() => log(`Salvo no servidor (chave #${key}).`)).catch(() => {
    restore(b, prev); render({ enter: id }); if (S.detail === id) refreshDetail();
    toast({ msg: paid ? 'Não deu para salvar o pagamento' : 'Não deu para desfazer', desc: paid ? `${short} voltou para A pagar.` : `${short} continua paga.`, icon: 'warning-circle', cls: 'err', action: 'Tentar de novo', onAction: () => commit(id, paid), ms: 8000 });
    log(`Servidor recusou (chave #${key}). Estado anterior restaurado.`);
  });
}
// F4: outro aparelho já pagou. O servidor responde com o estado confirmado; nada é duplicado.
function already(b) {
  S.remote = false;
  Object.assign(b, { status: 'paid', paidAt: TODAY, paidTime: '9:40', by: 'Marina', payer: { name: 'Marina' }, recon: 'waiting', already: true });
  leaveThen(b.id, () => render());
  if (S.detail === b.id) refreshDetail();
  else toast({ msg: `${b.name.split(' · ')[0]} já estava paga`, desc: 'Marina registrou às 9:40. Nada foi duplicado.', icon: 'info', action: 'Ver', onAction: () => { setTab('paid'); setTimeout(() => openDetail(b.id), 260); } });
  log('Servidor: já paga por Marina às 9:40. Nenhum evento novo criado.');
}

/* ---------- Detalhe: a linha vira o modal ---------- */
const payerLabel = p => !p ? 'Não informado' : p === 'mine' ? 'Minha conta' : p === 'cash' ? 'Dinheiro' : p === 'other' ? 'Outra origem' : p.name;
const kv = (k, v, { btn, act, sub } = {}) => `<${btn ? `button class="kv btn" data-act="${act}"` : 'div class="kv"'}><span class="k1">${k}</span><span class="v1">${sub ? `<span class="vv"><span>${v}</span><small>${sub}</small></span>` : v}${btn ? '<i class="ph ph-caret-right"></i>' : ''}</span></${btn ? 'button' : 'div'}>`;
function detailHTML(b) {
  const paid = isPaid(b), d = days(TODAY, b.due);
  const top = `<div class="dt-top"><span class="dt-sub" style="margin:0">${paid ? 'Conta paga' : 'Conta a pagar'}</span><button class="ib" data-act="close" aria-label="Fechar"><i class="ph ph-x"></i></button></div>
    <div class="dt-id"><span class="dot" data-share="dot"><i class="ph ph-${b.icon}"></i></span><div><div class="dt-name" data-share="name">${esc(b.name)}</div><div class="dt-sub">${esc(b.cat)} · conta da casa</div></div></div>`;
  if (!paid) {
    const st = d < 0 ? `Em aberto · venceu há ${plural(-d, 'dia', 'dias')}` : d === 0 ? 'Em aberto · vence hoje' : `Em aberto · vence em ${plural(d, 'dia', 'dias')}`;
    const tipo = b.type === 'fatura' ? 'Fatura de cartão' : b.rec ? `Recorrente · todo dia ${Number(b.due.slice(8))}` : 'Avulsa';
    return `<div class="dt">${top}<div class="dt-amt"><div data-share="amt">${amtHTML(b.amount)}</div><div class="dt-st"><span class="sdot" style="background:var(--warn)"></span>${st}</div></div>
      <div class="dt-g">${kv('Vencimento', longDate(b.due))}${kv('Tipo', tipo)}${kv('Origem', b.src === 'manual' ? 'Manual' : 'Integração', { sub: b.src === 'manual' ? `${b.createdBy || 'Você'} cadastrou` : 'Fatura lida do Nubank' })}
      ${b.debit ? kv('Débito agendado', b.debit, { sub: 'Não conta como pago até sair' }) : ''}${b.rec ? kv('Próxima', `${Number(b.due.slice(8))} dez · em aberto`) : ''}</div>
      <div class="dt-act"><button class="btn1" data-act="mark"><i class="ph ph-check"></i>Marcar como paga</button></div>
      <p class="dt-note">Marcar não depende do banco. Se o pagamento aparecer no extrato de uma conta conectada, a gente confere sozinho.</p></div>`;
  }
  const status = b.queued ? 'Neste iPhone · salva ao reconectar' : `Paga ${whenPaid(b)}, ${b.paidTime} · registrado por ${who(b.by)}`;
  const person = b.payer && b.payer.name;
  let bank, note, extra = '';
  if (b.queued) { bank = kv('Banco', '<i class="ph ph-cloud-slash"></i>Depois de salvar'); note = 'Esta mudança está só neste iPhone. Quando a conexão voltar, ela é enviada; até lá, ninguém da casa vê.'; }
  else if (b.recon === 'matched') {
    bank = kv('Banco', '<i class="ph ph-check-circle ok"></i>Conferida');
    extra = `<div class="dt-sec">No extrato</div><div class="dt-tx"><div class="tx"><span class="dot"><i class="ph ph-${b.icon}"></i></span><span class="tx-t"><span class="tx-n">${b.tx.name}</span><span class="tx-m">${b.tx.meta}</span></span><span class="tx-r"><span class="tx-v">−${money(b.amount)}</span><span class="who"><i>${b.tx.ini}</i>${b.tx.who}</span></span></div></div>`;
    note = `A transação de ${money(b.amount)} já conta nos gastos do mês; ligar à conta não soma de novo.`;
  } else if (b.recon === 'review') { bank = kv('Banco', `${b.cands.length} parecidas · Revisar`, { btn: true, act: 'review' }); note = 'A conta continua paga enquanto você decide.'; }
  else if (b.recon === 'na') { bank = kv('Banco', '<i class="ph ph-minus-circle"></i>Não se aplica'); note = 'Sem extrato para conferir, e tudo bem: a conta continua paga e fora do total a pagar.'; }
  else { bank = kv('Banco', `<i class="ph ph-clock"></i>${person ? `Procurando nas contas de ${person}` : 'Aguardando o extrato'}`, person ? {} : { sub: 'Itaú e Nubank atualizados às 9:38' }); note = 'Quando o pagamento aparecer no extrato de uma conta conectada, a gente liga os dois sozinho. Seus totais não mudam.'; }
  const info = b.already ? `<div class="info"><i class="ph ph-info"></i><span>Já estava paga. Marina registrou no iPhone dela às 9:40; nada foi duplicado.</span></div>` : '';
  const reg = b.by !== ME || person ? kv('Registrado por', b.by === ME ? 'Você' : b.by, { sub: `${cap(whenPaid(b))}, ${b.paidTime}` }) : '';
  return `<div class="dt">${top}<div class="dt-amt"><div data-share="amt">${amtHTML(b.amount)}</div><div class="dt-st"><span class="sdot"${b.queued ? ' style="background:var(--ghost)"' : ''}></span>${status}</div></div>${info}
    <div class="dt-g">${kv('Vencimento', longDate(b.due))}${kv('Quem pagou', person ? `<span class="av">${person[0]}</span>${esc(person)}` : payerLabel(b.payer), { btn: true, act: 'payer' })}${reg}${bank}</div>${extra}
    <div class="dt-act">${b.recon === 'matched' ? `<button class="btnt" data-act="unlink" style="font-size:14px;color:var(--text-2)">Não é esta transação</button>` : `<button class="btn2" data-act="unmark"><i class="ph ph-arrow-counter-clockwise"></i>Desfazer pagamento</button>`}</div>
    <p class="dt-note">${note}</p></div>`;
}
let payerOpen = false, pick = null;
function payerHTML(b) {
  const cur = b.payer, isP = (v) => v === 'person' ? !!(cur && cur.name) || payerOpen : JSON.stringify(cur ?? null) === JSON.stringify(v);
  const o = (v, t, s, ic) => `<button class="optn" role="radio" data-payer="${v === null ? 'none' : v}" aria-checked="${isP(v)}"><span class="dot"><i class="ph ph-${ic}"></i></span><span class="t"><b>${t}</b><span>${s}</span></span><i class="mk ph${isP(v) ? '-fill ph-check-circle' : ' ph-circle'}"></i></button>`;
  const people = isP('person') ? `<div class="people"><button class="spill" role="radio" data-person="Marina" aria-checked="${cur?.name === 'Marina'}">Marina</button><input id="otherName" placeholder="Outro nome…" aria-label="Nome de quem pagou" value="${cur?.name && cur.name !== 'Marina' ? esc(cur.name) : ''}"></div>` : '';
  return `<div class="dt"><div class="dt-top" style="justify-content:flex-start;gap:4px;padding-left:8px"><button class="ib" style="background:none" data-act="back" aria-label="Voltar ao detalhe"><i class="ph ph-arrow-left"></i></button><span class="ttl">Quem pagou?</span></div>
    <div class="opts" role="radiogroup">${o(null, 'Não informado', 'Padrão. Não muda nada na conta.', 'minus-circle')}${o('mine', 'Minha conta', 'Procuramos nas suas contas conectadas', 'bank')}${o('person', 'Outra pessoa', 'Marina ou alguém de fora da casa', 'user')}${people}${o('cash', 'Dinheiro', 'Não aparece em extrato', 'money')}${o('other', 'Outra origem', 'Banco não conectado, empresa…', 'dots-three-circle')}</div>
    <p class="dt-note">Opcional. Serve para conferir com o banco certo; quem registrou continua sendo ${who(b.by)}.</p></div>`;
}
function reviewHTML(b) {
  return `<div class="dt"><div class="dt-top" style="justify-content:flex-start;gap:4px;padding-left:8px"><button class="ib" style="background:none" data-act="back" aria-label="Voltar ao detalhe"><i class="ph ph-arrow-left"></i></button><span class="ttl">Conferir com o extrato</span></div>
    <p class="dt-lede">${esc(b.name)}, ${money(b.amount)}, paga ${whenPaid(b)}. Qual destas é ela?</p>
    <div class="cands" role="radiogroup">${b.cands.map(c => `<button class="cand" role="radio" data-cand="${c.id}" aria-checked="${pick === c.id}"><span class="tx"><span class="dot"><i class="ph ph-${b.icon}"></i></span><span class="tx-t"><span class="tx-n">${c.name}</span><span class="tx-m">${c.meta}</span></span><span class="tx-r"><span class="tx-v">−${money(b.amount)}</span><span class="who"><i>${c.ini}</i>${c.who}</span></span></span><i class="mk ph${pick === c.id ? '-fill ph-check-circle' : ' ph-circle'}"></i></button>`).join('')}</div>
    <div class="dt-act"><button class="btn1" data-act="link"${pick ? '' : ' disabled'}>${pick ? `Ligar à de ${b.cands.find(c => c.id === pick).meta.split(', ')[1]}` : 'Escolha uma transação'}</button><button class="btnt" data-act="ignore" style="font-size:14px;color:var(--text-2)">Nenhuma delas</button></div>
    <p class="dt-note">A conta continua paga em qualquer escolha. Nenhuma delas não volta a sugerir estas duas.</p></div>`;
}
function fit(L, max = 800) { L.style.width = '378px'; const h = Math.min(max, L.offsetHeight); return { x: 12, y: 862 - h, w: 378, h, r: 43, c: 1, e: 1, s: 1 }; }
function swap(html, omega = OMEGA.back) { const L = modal.makeLayer(html); modal.morph({ to: fit(L), next: L, omega }); }
function openDetail(id) {
  const row = rowEl(id); if (!row || S.view !== 'list') return;
  qIn.blur();
  const r = rel(row), b = byId(id);
  S.view = 'detail'; S.detail = id; payerOpen = false;
  modal.el.innerHTML = '';
  modal.set({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0, c: 1, e: 0, s: 0 });
  modal.layer = modal.makeLayer(`<div class="bill" style="pointer-events:none">${row.innerHTML}</div>`);
  row.style.visibility = 'hidden'; scrimEl.classList.add('on');
  const L = modal.makeLayer(detailHTML(b));
  modal.morph({ to: fit(L), next: L, omega: OMEGA.open, end: () => L.querySelector('[data-act="close"]')?.focus({ preventScroll: true }) });
}
function refreshDetail() { if (S.view === 'detail' && S.detail) swap(detailHTML(byId(S.detail))); }
function closeModal(after) {
  if (S.view === 'list') return;
  const wasSheet = S.view === 'filters' || S.view === 'add', id = S.detail;
  S.view = 'list'; S.detail = null; scrimEl.classList.remove('on');
  const done = () => { modal.el.style.display = 'none'; modal.el.innerHTML = ''; modal.layer = null; dockEl.classList.remove('away'); $list.querySelectorAll('.bill').forEach(r => (r.style.visibility = '')); syncScrim(); after && after(); };
  if (wasSheet) { const L = modal.makeLayer(''); return modal.morph({ to: DOCK, next: L, omega: OMEGA.close, end: done }); }
  const row = id && rowEl(id), r = row && rel(row);
  if (!row || r.y > 874 || r.y + r.h < 0) return modal.morph({ to: { ...modal.cur, y: 874, s: 0, e: 0 }, omega: OMEGA.close, end: done });
  const L = modal.makeLayer(`<div class="bill" style="pointer-events:none">${row.innerHTML}</div>`);
  row.style.visibility = 'hidden';
  modal.morph({ to: { x: r.x, y: r.y, w: r.w, h: r.h, r: 0, c: 1, e: 0, s: 0 }, next: L, omega: OMEGA.close, end: done });
}
function setPayer(v) {
  const b = byId(S.detail);
  b.payer = v;
  if (b.recon !== 'matched') b.recon = v === 'cash' || v === 'other' || (v && v.external) ? 'na' : b.cands && !b.ignored ? 'review' : 'waiting';
  payerOpen = false; render(); rowEl(b.id) && (rowEl(b.id).style.visibility = 'hidden');
  S.view = 'detail'; swap(detailHTML(b));
}

/* ---------- Folhas: a cápsula vira filtros ou nova conta ---------- */
function openSheet(kind) {
  if (S.view !== 'list') return;
  qIn.blur(); S.view = kind; dockEl.classList.add('away'); scrimEl.classList.add('on');
  modal.el.innerHTML = ''; modal.set(DOCK); modal.layer = modal.makeLayer('');
  if (kind === 'filters') S.draft = clone(S.f); else form = { desc: '', amt: '', due: '2026-11-06', rec: true, err: {}, busy: false };
  const L = modal.makeLayer(kind === 'filters' ? filtersHTML() : addHTML());
  modal.morph({ to: fit(L), next: L, omega: OMEGA.sheet, end: () => { kind === 'filters' ? L.querySelectorAll('.seg').forEach(s => placeThumb(s, true)) : L.querySelector('#fDesc')?.focus(); } });
}
const sheetHead = t => `<div class="fs-head"><div class="grab"></div><div class="fs-row"><div class="fs-title">${t}</div><button class="ib" data-act="close" aria-label="${t === 'Filtros' ? 'Fechar sem aplicar' : 'Cancelar'}"><i class="ph ph-x"></i></button></div></div>`;
const seg2 = (key, cur, opts) => `<div class="seg" role="radiogroup"><span class="sthumb"></span>${opts.map(([v, l]) => `<button role="radio" data-${key}="${v}" aria-checked="${cur === v}">${l}</button>`).join('')}</div>`;
function filtersHTML() {
  const d = S.draft, list = S.tab === 'open' ? openList : paidList, n = list(d, S.q).length;
  const cnt = t => list({ ...d, types: [t] }, S.q).length;
  return `<div class="fs">${sheetHead('Filtros')}<div class="fs-body" style="max-height:none">
    <section class="fsec" style="padding-top:6px"><div class="fh"><h3>Período</h3></div><div class="row-pills"><button class="spill" aria-checked="true">Novembro</button><button class="spill" aria-checked="false">Dezembro</button><button class="spill" aria-checked="false">Personalizado</button></div></section>
    <section class="fsec"><div class="fh"><h3>Tipo</h3><span>${d.types.length ? plural(d.types.length, 'escolhido', 'escolhidos') : 'Todos'}</span></div><div class="chips">${Object.entries(TYPE).map(([t, l]) => `<button class="chip" role="checkbox" data-ftype="${t}" aria-checked="${d.types.includes(t)}"><span class="ic"><i class="ph ph-${t === 'fatura' ? 'credit-card' : t === 'fixa' ? 'equals' : 'wave-sine'} cat"></i><i class="ph ph-check"></i></span>${l.split(' ')[0]}<span class="n">${cnt(t)}</span></button>`).join('')}</div></section>
    <section class="fsec"><div class="fh"><h3>Recorrência</h3></div>${seg2('frec', d.rec, [['all', 'Todas'], ['rec', 'Recorrentes'], ['one', 'Avulsas']])}</section>
    <section class="fsec"><div class="fh"><h3>Origem</h3></div>${seg2('fsrc', d.src, [['all', 'Todas'], ['manual', 'Manual'], ['integracao', 'Integração']])}</section>
    <p class="expl" style="margin-top:12px">Pago ou em aberto não é filtro: é A pagar | Pagas.</p></div>
    <div class="fs-foot"><button class="btn2" data-act="f-clear"${fCount(d) ? '' : ' disabled'}>Limpar</button><button class="btn1" data-act="f-apply"${n ? '' : ' disabled'}>${n ? `Mostrar ${plural(n, 'conta', 'contas')}` : 'Nenhuma conta'}</button></div></div>`;
}
function redrawFilters() { const L = modal.layer, y = L.querySelector('.fs-body').scrollTop; L.innerHTML = filtersHTML(); L.querySelector('.fs-body').scrollTop = y; L.querySelectorAll('.seg').forEach(s => placeThumb(s, true)); }
let form = null;
function addHTML() {
  const f = form, e = f.err;
  return `<div class="fs">${sheetHead('Nova conta')}<div class="add-body">
    <label class="fld${e.desc ? ' err' : ''}"><span>Descrição</span><span class="box"><input id="fDesc" placeholder="Ex.: Aluguel, Escola, Luz" value="${esc(f.desc)}"></span><span class="help" id="hDesc">${e.desc || 'Como aparece na lista'}</span></label>
    <label class="fld${e.amt ? ' err' : ''}"><span>Valor</span><span class="money"><span>R$</span><input id="fAmt" inputmode="decimal" placeholder="0,00" value="${esc(f.amt)}"></span><span class="help">${e.amt || 'Se varia, use uma estimativa. Dá para ajustar em cada mês.'}</span></label>
    <label class="fld${e.due ? ' err' : ''}"><span>Vencimento</span><span class="box"><input id="fDue" type="date" value="${f.due}" min="2026-10-01"></span>${e.due ? `<span class="help">${e.due}</span>` : ''}</label>
    <button class="trow" role="switch" data-act="f-rec" aria-checked="${f.rec}"><span class="t"><b>Repetir todo mês</b><span>Cada mês vira uma conta própria</span></span><span class="sw"><i></i></span></button>
    ${e.save ? `<div class="info" style="margin:0;background:transparent;color:var(--over-ink);padding:0"><i class="ph ph-warning-circle"></i><span>${e.save}</span></div>` : ''}</div>
    <div class="fs-foot"><button class="btn1" data-act="add-save"${f.busy ? ' aria-busy="true"' : ''}>${f.busy ? 'Adicionando…' : 'Adicionar conta'}</button></div></div>`;
}
function redrawAdd(focus) { modal.layer.innerHTML = addHTML(); const to = fit(modal.layer); modal.morph({ to, omega: OMEGA.back }); focus && modal.layer.querySelector(focus)?.focus(); }
function readForm() { const L = modal.layer; form.desc = L.querySelector('#fDesc').value; form.amt = L.querySelector('#fAmt').value; form.due = L.querySelector('#fDue').value; }
async function submitAdd() {
  if (form.busy) return; // envio único: toques repetidos não duplicam
  readForm();
  const v = Number(form.amt.replace(/\./g, '').replace(',', '.')), err = {};
  if (!form.desc.trim()) err.desc = 'Dê um nome para a conta, como “Aluguel”.';
  if (!(v > 0)) err.amt = 'Informe um valor acima de R$ 0,00.';
  if (!form.due) err.due = 'Escolha o dia do vencimento.';
  form.err = err;
  if (Object.keys(err).length) { redrawAdd(err.desc ? '#fDesc' : err.amt ? '#fAmt' : '#fDue'); return; }
  form.busy = true;
  const pend = setTimeout(() => { if (form.busy) redrawAdd(); }, 300 * SLOW);
  try { await save(); } catch { clearTimeout(pend); form.busy = false; form.err = { save: 'Não deu para salvar agora. O que você digitou continua aqui.' }; redrawAdd(); return; }
  clearTimeout(pend);
  const b = { id: 'n' + Date.now(), name: form.desc.trim(), icon: 'receipt', amount: v, due: form.due, type: 'fixa', rec: form.rec, src: 'manual', status: 'open', cat: 'Casa' };
  bills.push(b); S.tab = 'open'; S.fresh = b.id; S.q = ''; qIn.value = ''; S.f = clone(DEFAULT_F);
  $('segTabs').querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-checked', x.dataset.tab === 'open'));
  if (bucket(b) === 'later') S.later = true;
  closeModal(() => { render({ enter: b.id }); rowEl(b.id)?.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' }); });
  toast({ msg: `Conta adicionada em ${groupName(b)}` });
}

/* ---------- Eventos ---------- */
phone.addEventListener('click', e => {
  const t = e.target.closest('[data-ring],[data-open],[data-act],[data-tab],[data-payer],[data-person],[data-cand],[data-ftype],[data-frec],[data-fsrc]'); if (!t) return;
  const d = t.dataset;
  if (d.ring) return commit(d.ring, !isPaid(byId(d.ring)));
  if (d.open) return openDetail(d.open);
  if (d.tab) return setTab(d.tab);
  if (d.payer) { if (d.payer === 'person') { payerOpen = true; return swap(payerHTML(byId(S.detail))); } return setPayer(d.payer === 'none' ? null : d.payer); }
  if (d.person) return setPayer({ name: d.person });
  if (d.cand) { pick = d.cand; return (modal.layer.innerHTML = reviewHTML(byId(S.detail))); }
  if (d.ftype) { const a = S.draft.types; S.draft.types = a.includes(d.ftype) ? a.filter(x => x !== d.ftype) : [...a, d.ftype]; return redrawFilters(); }
  if (d.frec) { S.draft.rec = d.frec; return redrawFilters(); }
  if (d.fsrc) { S.draft.src = d.fsrc; return redrawFilters(); }
  const b = S.detail && byId(S.detail);
  switch (d.act) {
    case 'later': S.later = !S.later; t.setAttribute('aria-expanded', S.later); $('lbody')?.classList.toggle('open', S.later); return;
    case 'close': return closeModal();
    case 'mark': if (S.remote && b.id === 'net') return already(b); { const id = b.id; return closeModal(() => commit(id, true)); }
    case 'unmark': return commit(b.id, false, { fromDetail: true });
    case 'payer': return swap(payerHTML(b));
    case 'review': pick = null; return swap(reviewHTML(b));
    case 'back': payerOpen = false; return swap(detailHTML(b));
    case 'link': { const c = b.cands.find(x => x.id === pick); Object.assign(b, { recon: 'matched', tx: { name: c.name, meta: `Casa · ${c.meta}`, who: c.who, ini: c.ini } }); render(); rowEl(b.id) && (rowEl(b.id).style.visibility = 'hidden'); return swap(detailHTML(b)); }
    case 'ignore': b.recon = 'waiting'; b.ignored = true; render(); rowEl(b.id) && (rowEl(b.id).style.visibility = 'hidden'); return swap(detailHTML(b));
    case 'unlink': b.recon = 'waiting'; delete b.tx; return swap(detailHTML(b));
    case 'filters': return openSheet('filters');
    case 'add': return S.view === 'list' ? openSheet('add') : null;
    case 'f-clear': S.draft = clone(DEFAULT_F); return redrawFilters();
    case 'f-apply': S.f = clone(S.draft); return closeModal(() => render({ fade: true }));
    case 'f-rec': readForm(); form.rec = !form.rec; t.setAttribute('aria-checked', form.rec); return;
    case 'add-save': return submitAdd();
    case 'q-clear': S.q = ''; qIn.value = ''; t.hidden = true; return render();
    case 'tab-paid': return setTab('paid');
    case 'tab-open': return setTab('open');
    case 'clear-all': { const pf = clone(S.f), pq = S.q; S.f = clone(DEFAULT_F); S.q = ''; qIn.value = ''; dockEl.querySelector('.qclear').hidden = true; render({ fade: true });
      return toast({ msg: 'Busca e filtros limpos', action: 'Desfazer', onAction: () => { S.f = pf; S.q = pq; qIn.value = pq; dockEl.querySelector('.qclear').hidden = !pq; render({ fade: true }); } }); }
    case 'reload': S.load = 'loading'; render(); return setTimeout(() => { S.load = 'ok'; render({ fade: true }); }, 900 * SLOW);
  }
});
phone.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target.id === 'otherName' && e.target.value.trim()) setPayer({ name: e.target.value.trim(), external: true });
  if (e.key === 'Enter' && S.view === 'add') submitAdd();
});
scrimEl.addEventListener('click', () => closeModal());
qIn.addEventListener('input', () => { S.q = qIn.value; dockEl.querySelector('.qclear').hidden = !S.q; render(); });
scroller.addEventListener('scroll', () => { const y = scroller.scrollTop; $('navTitle').style.opacity = clamp01((y - 22) / 16); $('scope').classList.toggle('stuck', y > 120); }, { passive: true });

/* ---------- Simulação ---------- */
$('simFail').addEventListener('change', e => { S.fail = e.target.checked; log(S.fail ? 'A próxima gravação vai falhar.' : ''); });
$('simOffline').addEventListener('change', async e => {
  S.offline = e.target.checked; render();
  if (S.offline) return log('Sem conexão. Marcar continua funcionando, mas fica neste iPhone.');
  if (!S.queue.length) return log('Conexão de volta.');
  log(`Conexão de volta. Enviando ${plural(S.queue.length, 'mudança', 'mudanças')} com as mesmas chaves…`);
  await later(800);
  S.queue = []; bills.forEach(b => delete b.queued); render();
  toast({ msg: 'Pagamento salvo', desc: 'O que estava neste iPhone foi enviado.', icon: 'check' });
  log('Fila enviada. Agora a casa toda vê.');
});
document.querySelector('.sim').addEventListener('click', e => {
  const k = e.target.closest('[data-sim]')?.dataset.sim; if (!k) return;
  if (S.view !== 'list' && k !== 'statement') closeModal();
  if (k === 'statement') {
    const done = [];
    for (const b of bills) if (isPaid(b) && b.recon === 'waiting' && !b.queued && !b.ignored) {
      const p = b.payer && b.payer.name;
      b.recon = 'matched'; b.tx = { name: b.name.split(' · ').pop().toUpperCase().replace(/[ÁÃ]/g, 'A'), meta: `Casa · ${p ? 'Nubank' : 'Itaú'} · ${dm(TODAY)}`, who: p ? p : 'Você', ini: p ? p[0] : 'R' };
      done.push(b.name.split(' · ')[0]);
    }
    render(); if (S.detail) { rowEl(S.detail) && (rowEl(S.detail).style.visibility = 'hidden'); refreshDetail(); }
    return log(done.length ? `Extrato chegou. Conferidas: ${done.join(', ')}. Nada mudou nos totais.` : 'Extrato chegou. Nada novo para conferir (Água segue em Revisar).');
  }
  if (k === 'marina') {
    const b = byId('cond'); if (!b || isPaid(b)) return log('Condomínio já está paga.');
    Object.assign(b, { status: 'paid', paidAt: TODAY, paidTime: NOW, by: 'Marina', payer: { name: 'Marina' }, recon: 'waiting' });
    leaveThen('cond', () => render());
    toast({ msg: 'Marina pagou Condomínio', icon: 'users', pos: 'top', action: 'Ver', onAction: () => { setTab('paid'); setTimeout(() => openDetail('cond'), 280); } });
    return log('Evento da casa: Condomínio paga por Marina. Uma obrigação, contada uma vez.');
  }
  if (k === 'remote') { S.remote = true; return log('Marina pagou Internet às 9:40 no iPhone dela. Este iPhone ainda não sabe: toque o anel ou abra o detalhe.'); }
  if (k === 'allpaid') { bills.forEach(b => { if (!isPaid(b)) apply(b, true); }); setTab('open'); render(); return log('Tudo marcado como pago.'); }
  if (k === 'loadfail') { S.load = 'loading'; render(); setTimeout(() => { S.load = 'error'; render(); }, 700 * SLOW); return log('Contas não carregaram. Filtros e período preservados.'); }
  if (k === 'empty') { bills = []; render(); return log('Nenhuma conta cadastrada no período.'); }
  if (k === 'reset') { bills = clone(BILLS); Object.assign(S, { tab: 'open', later: false, q: '', f: clone(DEFAULT_F), load: 'ok', remote: false, queue: [] }); qIn.value = ''; $('segTabs').querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-checked', x.dataset.tab === 'open')); lastTotal = null; render(); log(''); }
});

render();
placeThumb($('segTabs'), true);
