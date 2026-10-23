# Cada microfrontend renova o próprio token: onde essa lógica deveria morar?

**Afirmação central:** quando N microfrontends renovam o mesmo token cada um por conta própria, a colisão derruba sessões e multiplica as chamadas de refresh por N. Um patch em `window.fetch` no shell e um módulo compartilhado resolvem; a diferença está em quem paga o custo e no que cada um esconde.

**Estado:** em revisão
**Artigo:** <https://lab.synko.digital/pt-br/005-fetch-interceptor-tradeoffs/> (en: `/en/`)
**LinkedIn:** a preencher após a publicação

## O que este repositório prova

- Num shell single-spa real, com dois MFEs que renovam o token cada um por conta própria, o clique em "Voltar" produz dois refreshes e perde a sessão em 15 de 15 tentativas. Com o patch ou com o módulo, são um refresh e duas consultas ok em 15 de 15.
- Num simulador de usuários (o código real dos clients e dos pacotes de auth, sem navegador), o baseline faz até N refreshes por usuário e a taxa de falha segue (N−1)/N com rotação. Com a rotação desligada, a falha some e a multiplicação fica.
- A tolerância de rotação no servidor elimina os logouts do baseline quando é maior que a janela de colisão, mas não as N chamadas.
- O patch e o módulo compartilhado têm o mesmo custo nos arquivos de client e o mesmo resultado nos cenários medidos.

## O que ele não prova

- A taxa real de logout de qualquer sistema: rotação estrita, latência de refresh de 150 ms e "qualquer falha derruba a sessão" são decisões do lab.
- Os riscos do interceptor global descritos no artigo (`AbortSignal` sobrescrito, promises penduradas, `undefined` no `catch`) vêm de uma auditoria de código. Não foram medidos aqui.
- Clientes que não usam `fetch`, como o Axios (XMLHttpRequest por padrão), não foram testados.
- A prevalência da arquitetura "cada MFE renova o próprio token".

## Como reproduzir

```bash
cd lab
npm install
npm run up          # build, API (4191) e web (4180)
```

Abra `http://localhost:4180/?variant=baseline` (ou `patch`, `utility`), abra um produto, use "Vencer token" e clique em "Voltar". Para parar tudo: `npm run stop`.

```bash
npm run benchmark   # navegador, com Playwright: S1, S2, S5, S6, S8
npm run scale       # usuários simulados no Node (cenários A a E)
```

Os diagramas do artigo vêm de `design/diagrams/build.py` (SVGs em `post/assets/`, em português e inglês).

O vídeo (`post/assets/reel-005.mp4`, 1080×1350, 15 s) é feito a partir de uma gravação real do lab. Com o lab no ar (`npm run up`):

```bash
cd motion
node record.mjs     # grava baseline e patch: frames, cliques, requests e contadores
node render.mjs     # renderiza out/reel-005.mp4 com o som sintetizado
```

`post/assets/reel-005.mp4` é essa saída reencodada para a web (H.264, cerca de 2,7 MB).

## Resultados

| Medição | Baseline | Patch e módulo | Dados |
| --- | --- | --- | --- |
| Dois MFEs, token vencido (15 tentativas) | 2 refreshes, sessão perdida em 15/15 | 1 refresh, ok em 15/15 | [`evidence/summary.json`](evidence/summary.json) |
| Duas abas (10 tentativas) | 4 refreshes, sessão perdida em 10/10 | 1 refresh, ok em 10/10 | [`evidence/summary.json`](evidence/summary.json) |
| 20 MFEs, janela de 200 ms (1.000 usuários) | 16,53 refreshes por usuário, 94% falham, 100% deslogados | 1 refresh, 0% deslogados | [`evidence/scale-benchmark.json`](evidence/scale-benchmark.json) |
| Patch carregado como MFE (20 tentativas) | n/a | requests de montagem ok em 6/20 (20/20 no shell) | [`evidence/summary.json`](evidence/summary.json) |
| Custo nos arquivos de client (2 MFEs) | n/a | patch: +4/−86 linhas; módulo: +6/−86 | [`evidence/migration-cost.json`](evidence/migration-cost.json) |
| Apollo lê o `fetch` global a cada request | n/a | 3.14 e 4.3 | [`evidence/spike-httplink-fetch.json`](evidence/spike-httplink-fetch.json) |

Ambiente, versões e parâmetros: [`evidence/environment.json`](evidence/environment.json).
