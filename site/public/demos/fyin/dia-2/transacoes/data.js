/* Dados de exemplo. Hoje é sexta, 30 out 2026. A casa é Marina + Rafael; toda conta tem um dono. */
const TODAY = '2026-10-30';
const PEOPLE = { M: { name: 'Marina', ini: 'M' }, R: { name: 'Rafael', ini: 'R' } };
const SCOPES = ['Casa', 'Marina', 'Rafael'];

const ACC = {
  'nu-cc':  { name: 'Nubank crédito', short: 'Nubank crédito', last4: '4821', owner: 'M', color: '#820AD1', ini: 'nu', inst: 'Nubank' },
  'nu-ct':  { name: 'Nubank conta', short: 'Nubank conta', owner: 'M', color: '#820AD1', ini: 'nu', inst: 'Nubank' },
  'it-cc':  { name: 'Itaú crédito', short: 'Itaú crédito', last4: '0937', owner: 'R', color: '#EC7000', ini: 'it', inst: 'Itaú' },
  'it-ct':  { name: 'Itaú conta corrente', short: 'Itaú conta', owner: 'R', color: '#EC7000', ini: 'it', inst: 'Itaú' },
  'in-ct':  { name: 'Inter conta', short: 'Inter conta', owner: 'R', color: '#FF7A00', ini: 'in', inst: 'Inter' },
};

const CAT = {
  mercado:      { name: 'Mercado', icon: 'shopping-cart' },
  delivery:     { name: 'Delivery', icon: 'hamburger' },
  restaurantes: { name: 'Restaurantes', icon: 'fork-knife' },
  transporte:   { name: 'Transporte', icon: 'car' },
  combustivel:  { name: 'Combustível', icon: 'gas-pump' },
  moradia:      { name: 'Moradia', icon: 'house' },
  contas:       { name: 'Contas da casa', icon: 'lightning' },
  saude:        { name: 'Saúde', icon: 'pill' },
  bemestar:     { name: 'Bem-estar', icon: 'barbell' },
  assinaturas:  { name: 'Assinaturas', icon: 'television-simple' },
  compras:      { name: 'Compras', icon: 'shopping-bag' },
  pets:         { name: 'Pets', icon: 'paw-print' },
  lazer:        { name: 'Lazer', icon: 'film-strip' },
  educacao:     { name: 'Educação', icon: 'book-open' },
  salario:      { name: 'Salário', icon: 'briefcase' },
  recebido:     { name: 'Pix recebido', icon: 'arrow-down-left' },
  estorno:      { name: 'Estorno', icon: 'arrow-counter-clockwise' },
  transfer:     { name: 'Entre vocês', icon: 'arrows-left-right' },
  fatura:       { name: 'Pagamento de fatura', icon: 'credit-card' },
  semcat:       { name: 'Sem categoria', icon: 'question' },
};
// Categorias que a pessoa escolhe (filtro e edição). Transferência e fatura são tipos, não categorias.
const PICKABLE = ['mercado', 'delivery', 'restaurantes', 'transporte', 'combustivel', 'moradia', 'contas', 'saude', 'bemestar', 'assinaturas', 'compras', 'pets', 'lazer', 'educacao', 'salario', 'recebido', 'estorno', 'semcat'];

/* [dia, hora, nome, categoria, conta, valor, extra]  extra: p = pendente, i = [parcela, de, total], d = descrição do banco */
const OCT = [
  [30, '10:42', 'Pão de Açúcar', 'mercado', 'nu-cc', -130.70, { p: 1, d: 'PAODEACUCAR 1234 SAO PAULO' }],
  [30, '08:15', 'Padaria Bella', 'restaurantes', 'it-cc', -23.40, { p: 1 }],
  [30, '07:58', 'Uber', 'transporte', 'it-cc', -18.90, { p: 1, d: 'UBER *TRIP HELP.UBER.COM' }],
  [29, '21:10', 'iFood', 'delivery', 'nu-cc', -89.90, { d: 'IFD*IFOOD.COM AGENCIA' }],
  [29, '19:02', 'Drogasil', 'saude', 'nu-cc', -64.35],
  [29, '12:30', 'Pix de Rafael', 'transfer', 'nu-ct', 500, { k: 'transfer', d: 'PIX RECEBIDO RAFAEL EXEMPLO' }],
  [29, '12:30', 'Pix para Marina', 'transfer', 'it-ct', -500, { k: 'transfer', d: 'PIX ENVIADO MARINA EXEMPLO' }],
  [28, '20:45', 'Rappi', 'delivery', 'it-cc', -72.80],
  [28, '18:20', 'Posto Shell', 'combustivel', 'it-cc', -210.00],
  [28, '13:05', 'Coco Bambu', 'restaurantes', 'nu-cc', -186.40],
  [27, '19:40', 'Hortifruti', 'mercado', 'nu-cc', -96.12],
  [27, '10:00', 'Amazon', 'compras', 'nu-cc', -214.90, { i: [2, 6, 1289.40], d: 'AMAZON MARKETPLACE PARC 02/06' }],
  [26, '14:30', 'Cobasi', 'pets', 'nu-cc', -187.60],
  [26, '08:00', 'Smart Fit', 'bemestar', 'it-cc', -129.90],
  [25, '21:00', 'Cinemark', 'lazer', 'nu-cc', -96.00],
  [25, '11:20', 'Feira da Vila', 'mercado', 'nu-ct', -58.00, { d: 'PIX ENVIADO JOSE A FEIRANTE' }],
  [24, '16:40', 'Zara', 'compras', 'nu-cc', -289.90],
  [24, '13:10', '99', 'transporte', 'it-cc', -24.70],
  [23, '18:00', 'Pix de Estúdio Lumen', 'recebido', 'in-ct', 1800.00, { d: 'PIX RECEBIDO ESTUDIO LUMEN LTDA' }],
  [23, '12:15', 'Outback', 'restaurantes', 'it-cc', -168.50],
  [22, '20:00', 'Carrefour', 'mercado', 'it-cc', -412.38],
  [22, '09:30', 'Sem Parar', 'transporte', 'it-cc', -70.00],
  [21, '19:30', 'iFood', 'delivery', 'it-cc', -54.90],
  [21, '08:10', 'Uber', 'transporte', 'nu-cc', -22.40],
  [20, '15:00', 'Renner', 'compras', 'nu-cc', -133.30, { i: [1, 3, 399.90] }],
  [20, '10:00', 'Fatura Nubank', 'fatura', 'nu-ct', -2310.44, { k: 'invoice', d: 'PAGAMENTO DE FATURA NU PAGAMENTOS' }],
  [19, '17:20', 'Livraria Cultura', 'educacao', 'it-cc', -142.80],
  [19, '12:02', 'PIX QRS 4892 MERCPAGO', 'semcat', 'nu-ct', -45.00, { d: 'PIX QRS 4892 MERCPAGO' }],
  [18, '21:15', 'Hortifruti', 'mercado', 'nu-cc', -82.40],
  [18, '11:00', 'Pão de Açúcar', 'mercado', 'nu-cc', -389.72],
  [17, '13:00', 'Uniqlo', 'compras', 'it-cc', -349.90],
  [16, '09:00', 'Enel', 'contas', 'it-ct', -238.61, { d: 'DEB AUT ENEL DISTRIBUICAO SP' }],
  [15, '08:00', 'Netflix', 'assinaturas', 'it-cc', -55.90],
  [14, '20:30', 'iFood', 'delivery', 'nu-cc', -76.50],
  [14, '12:00', 'Vivo Fibra', 'contas', 'it-ct', -129.99],
  [13, '18:45', 'Posto Ipiranga', 'combustivel', 'nu-cc', -185.00],
  [12, '13:30', 'Feijoada da Lana', 'restaurantes', 'nu-cc', -142.00],
  [11, '16:10', 'Decathlon', 'compras', 'it-cc', -229.90],
  [10, '10:00', 'Aluguel', 'moradia', 'it-ct', -3200.00, { d: 'TED IMOBILIARIA LOPES LTDA' }],
  [10, '10:00', 'Condomínio', 'moradia', 'it-ct', -780.00, { d: 'BOLETO COND ED JACARANDA' }],
  [10, '07:00', 'Spotify', 'assinaturas', 'nu-cc', -34.90],
  [9, '18:30', 'Drogaria Raia', 'saude', 'it-cc', -48.90],
  [8, '12:00', 'Pix de Rafael', 'transfer', 'nu-ct', 800, { k: 'transfer' }],
  [8, '12:00', 'Pix para Marina', 'transfer', 'it-ct', -800, { k: 'transfer' }],
  [8, '09:40', 'Uber', 'transporte', 'nu-cc', -31.20],
  [7, '09:00', 'Sabesp', 'contas', 'it-ct', -96.40],
  [6, '19:10', 'Carrefour', 'mercado', 'nu-cc', -356.18],
  [5, '09:00', 'Salário · Acme', 'salario', 'nu-ct', 8400.00, { d: 'CRED SALARIO ACME TECNOLOGIA' }],
  [5, '09:00', 'Salário · Studio Norte', 'salario', 'it-ct', 6950.00],
  [4, '20:50', 'Rappi', 'delivery', 'nu-cc', -61.30],
  [3, '15:00', 'Estorno Mercado Livre', 'estorno', 'nu-cc', 89.90],
  [3, '11:30', 'Petz', 'pets', 'nu-cc', -158.00],
  [2, '08:00', 'Wizard · mensalidade', 'educacao', 'it-ct', -420.00],
  [2, '06:00', 'Amazon Prime', 'assinaturas', 'it-cc', -19.90],
  [1, '06:00', 'Porto Seguro · auto', 'transporte', 'it-cc', -312.44, { i: [4, 12, 3749.28] }],
];

/* Meses anteriores: recorrências reais + compras sorteadas com semente fixa (sempre os mesmos números). */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const CATALOG = [
  ['Pão de Açúcar', 'mercado', 80, 420], ['Carrefour', 'mercado', 150, 450], ['Hortifruti', 'mercado', 40, 120],
  ['iFood', 'delivery', 35, 110], ['Rappi', 'delivery', 30, 90], ['Uber', 'transporte', 14, 45], ['99', 'transporte', 12, 35],
  ['Posto Shell', 'combustivel', 150, 260], ['Drogasil', 'saude', 20, 120], ['Coco Bambu', 'restaurantes', 120, 240],
  ['Cinemark', 'lazer', 40, 110], ['Amazon', 'compras', 40, 300], ['Cobasi', 'pets', 60, 200], ['Livraria Cultura', 'educacao', 40, 150],
];
function monthRows(y, m, idx) {
  const r = rng(y * 100 + m), days = new Date(Date.UTC(y, m, 0)).getUTCDate(), out = [];
  const amt = (a, b) => -Math.round((a + r() * (b - a)) * 100) / 100;
  out.push([5, '09:00', 'Salário · Acme', 'salario', 'nu-ct', 8400], [5, '09:00', 'Salário · Studio Norte', 'salario', 'it-ct', 6950]);
  out.push([10, '10:00', 'Aluguel', 'moradia', 'it-ct', -3200], [10, '10:00', 'Condomínio', 'moradia', 'it-ct', -780], [10, '07:00', 'Spotify', 'assinaturas', 'nu-cc', -34.9]);
  out.push([15, '08:00', 'Netflix', 'assinaturas', 'it-cc', -55.9], [14, '12:00', 'Vivo Fibra', 'contas', 'it-ct', -129.99], [16, '09:00', 'Enel', 'contas', 'it-ct', amt(190, 260)]);
  out.push([7, '09:00', 'Sabesp', 'contas', 'it-ct', amt(80, 110)], [2, '08:00', 'Wizard · mensalidade', 'educacao', 'it-ct', -420], [2, '06:00', 'Amazon Prime', 'assinaturas', 'it-cc', -19.9]);
  out.push([26, '08:00', 'Smart Fit', 'bemestar', 'it-cc', -129.9], [1, '06:00', 'Porto Seguro · auto', 'transporte', 'it-cc', -312.44, { i: [idx, 12, 3749.28] }]);
  out.push([20, '10:00', 'Fatura Nubank', 'fatura', 'nu-ct', amt(1800, 2600), { k: 'invoice' }]);
  out.push([8, '12:00', 'Pix de Rafael', 'transfer', 'nu-ct', 800, { k: 'transfer' }], [8, '12:00', 'Pix para Marina', 'transfer', 'it-ct', -800, { k: 'transfer' }]);
  for (let i = 0; i < 24; i++) {
    const [n, c, a, b] = CATALOG[Math.floor(r() * CATALOG.length)], d = 1 + Math.floor(r() * days);
    const h = String(8 + Math.floor(r() * 14)).padStart(2, '0') + ':' + String(Math.floor(r() * 60)).padStart(2, '0');
    out.push([d, h, n, c, r() < 0.55 ? 'nu-cc' : 'it-cc', amt(a, b)]);
  }
  return out.map(x => ({ x, y, m }));
}

let seq = 0;
function build(rows, y, m) {
  return rows.map(([d, time, name, cat, acc, amount, ex = {}]) => ({
    id: 't' + (++seq), date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time, name, cat, accId: acc, amount,
    status: ex.p ? 'pending' : 'posted', inst: ex.i || null, kind: ex.k || 'regular', desc: ex.d || name.toUpperCase(),
  }));
}
const TX = [
  ...build(OCT, 2026, 10),
  ...[[2026, 9, 3], [2026, 8, 2], [2026, 7, 1]].flatMap(([y, m, i]) => build(monthRows(y, m, i).map(o => o.x), y, m)),
];
const TX_BY_ID = Object.fromEntries(TX.map(t => [t.id, t]));
