# Abstrações de formulário e DX

**Afirmação central:** uma abstração local pode dar aos formulários React uma API declarativa e consistente. Essa DX transfere tipos, binding e convenções das telas para uma infraestrutura mantida pela equipe.

**Estado:** artigo em revisão
**Artigo:** [`post/post.md`](post/post.md) · será publicado em `lab.synko.digital/pt-br/002-form-abstractions-dx/`
**Chamada no LinkedIn:** [`post/linkedin-call.md`](post/linkedin-call.md)

## O que este repositório prova

O lab implementa o mesmo formulário em seis estratégias: quatro em React (abstração local com `useController`, a mesma abstração com `register`, RHF + Zod direto e `useState`), Vue e AngularJS. Ele torna inspecionáveis:

- o código escrito pelo consumidor;
- a infraestrutura adicional necessária;
- as decisões que o núcleo de cada tecnologia toma — ou deixa para a equipe;
- os pontos em que a abstração melhora a DX e os pontos em que ela vaza.

## O que ele não prova

Linhas de código não medem produtividade, qualidade ou custo total. As seis implementações também não são equivalentes em idade, ecossistema ou estratégia de renderização. O lab compara a superfície de autoria de um caso concreto; não elege um vencedor universal nem demonstra uma DX de framework.

## Como reproduzir

```bash
cd lab
npm install
npm run dev
```

Para gerar as evidências quantitativas:

```bash
npm run measure
npm run benchmark:react
```

## Resultados

Primeira medição de linhas de fonte não vazias:

| Grupo | Linhas |
|---|---:|
| React abstraído com Controller — consumidor | 21 |
| React abstraído com Controller — infraestrutura | 42 |
| React abstraído uncontrolled — consumidor | 21 |
| React abstraído uncontrolled — infraestrutura | 43 |
| Schema Zod compartilhado | 8 |
| React — RHF + Zod direto | 26 |
| React — somente `useState` | 37 |
| Vue — consumidor + validação | 27 |
| AngularJS — consumidor + validação | 43 |

Os dados brutos ficam em `evidence/metrics.json`. Para o primeiro formulário, os totais comparáveis são 71 linhas na abstração com Controller, 72 na abstração uncontrolled, 34 no RHF+Zod direto, 37 no React puro, 27 no Vue e 43 no AngularJS. Depois que a infraestrutura existe, ambos os call sites abstraídos caem para 21 linhas. As duas leituras importam.

No cenário automatizado (dez amostras após aquecimento; Apple M3 Pro, Chrome 143, React 19.3, RHF 7.89, Zod 4.6.5), as quatro versões React registraram:

| Estratégia | Chamadas de render | CPU mediana | CPU p95 | Bundle gzip |
|---|---:|---:|---:|---:|
| Abstração · Controller | 73 | 49,523 ms | 53,259 ms | 107.389 B |
| Abstração · uncontrolled | 11 | 33,061 ms | 38,418 ms | 106.257 B |
| RHF + Zod direto | 2 | 32,703 ms | 37,544 ms | 105.541 B |
| `useState` | 63 | 71,190 ms | 89,850 ms | 69.763 B |

Na abstração com Controller, 72 das 73 chamadas são renders localizados dos wrappers; na versão `useState`, as 63 renderizam o componente inteiro. Com a mesma interface pública, trocar `useController` por `register` aproximou a CPU do uso direto de RHF, e o overhead de bundle da abstração ficou entre 716 B e 1.848 B gzip. O modelo de binding interno pesa mais neste recorte do que a presença da abstração. São medidas deste formulário e ambiente, não uma previsão universal de UX. Os dados brutos ficam em `evidence/react-performance.json`.
