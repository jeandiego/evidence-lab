/* Dados de exemplo. Hoje é segunda, 2 nov 2026. Quem usa é Rafael (“você”); a casa é Rafael + Marina.
   Cada conta é uma ocorrência: recorrência é a regra, cada mês tem status e conferência próprios. */
const TODAY = '2026-11-02';
const NOW = '9:41';
const ME = 'Rafael';

// status: open | paid · recon (só em paga): waiting | matched | review | na · payer: null | mine | {name} | cash | other
const BILLS = [
  { id: 'energia', name: 'Energia · Enel', icon: 'lightning', amount: 189.90, due: '2026-11-01', type: 'variavel', rec: true, src: 'manual', status: 'open', cat: 'Luz', match: 'one' },
  { id: 'cond', name: 'Condomínio', icon: 'buildings', amount: 780.00, due: '2026-11-02', type: 'fixa', rec: true, src: 'manual', status: 'open', cat: 'Moradia', createdBy: 'Marina' },
  { id: 'net', name: 'Internet · Vivo', icon: 'wifi-high', amount: 119.90, due: '2026-11-02', type: 'fixa', rec: true, src: 'manual', status: 'open', cat: 'Casa', debit: 'Itaú' },
  { id: 'aluguel', name: 'Aluguel', icon: 'house-line', amount: 2400.00, due: '2026-11-05', type: 'fixa', rec: true, src: 'manual', status: 'open', cat: 'Moradia' },
  { id: 'fatura', name: 'Fatura Nubank', icon: 'credit-card', amount: 1284.37, due: '2026-11-07', type: 'fatura', rec: false, src: 'integracao', status: 'open', cat: 'Cartão de Marina' },
  { id: 'escola', name: 'Escola · mensalidade', icon: 'graduation-cap', amount: 1150.00, due: '2026-11-10', type: 'fixa', rec: true, src: 'manual', status: 'open', cat: 'Educação' },
  { id: 'saude', name: 'Plano de saúde', icon: 'heartbeat', amount: 912.40, due: '2026-11-15', type: 'fixa', rec: true, src: 'manual', status: 'open', cat: 'Saúde' },
  { id: 'gas', name: 'Gás · Comgás', icon: 'flame', amount: 76.30, due: '2026-11-18', type: 'variavel', rec: true, src: 'manual', status: 'open', cat: 'Casa' },
  { id: 'ipva', name: 'IPVA · parcela 3 de 3', icon: 'car-simple', amount: 412.00, due: '2026-11-25', type: 'fixa', rec: false, src: 'manual', status: 'open', cat: 'Transporte' },
  { id: 'spotify', name: 'Spotify Família', icon: 'music-notes', amount: 34.90, due: '2026-11-01', type: 'fixa', rec: true, src: 'manual', status: 'paid', paidAt: '2026-11-01', paidTime: '8:12', by: ME, payer: 'mine', recon: 'matched', cat: 'Assinaturas',
    tx: { name: 'SPOTIFY BR', meta: 'Assinaturas · Itaú · 1 nov', who: 'Você', ini: 'R' } },
  { id: 'seguro', name: 'Seguro do carro', icon: 'shield-check', amount: 228.15, due: '2026-11-03', type: 'fixa', rec: true, src: 'manual', status: 'paid', paidAt: '2026-11-01', paidTime: '19:30', by: 'Marina', payer: 'cash', recon: 'na', cat: 'Transporte' },
  { id: 'agua', name: 'Água · Sabesp', icon: 'drop', amount: 98.40, due: '2026-11-08', type: 'variavel', rec: true, src: 'manual', status: 'paid', paidAt: '2026-10-30', paidTime: '12:05', by: ME, payer: null, recon: 'review', cat: 'Casa',
    cands: [{ id: 'c1', name: 'SABESP', meta: 'Itaú · sex, 30 out', who: 'Você', ini: 'R' }, { id: 'c2', name: 'PIX SABESP AGUA', meta: 'Nubank · sáb, 31 out', who: 'Marina', ini: 'M' }] },
];

const TYPE = { fixa: 'Fixa', variavel: 'Variável', fatura: 'Fatura de cartão' };
const NEXT_BILL = 'O Aluguel, R$ 2.400,00, em 5 de dezembro';
