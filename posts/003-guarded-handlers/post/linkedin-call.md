---
post: "003"
channel: linkedin
lang: pt-br
status: review
video: ./assets/reel-003.mp4
link: https://lab.synko.digital/pt-br/003-guarded-handlers/?utm_source=linkedin&utm_medium=social&utm_campaign=003-guarded-handlers
---

# Chamada no LinkedIn · 003

## Copy do post

```text
Um `if` no começo de um handler costuma ser a solução mais simples.

A dúvida aparece quando conectividade, permissão e confirmação se repetem em várias ações. Cada handler acaba reconstruindo a mesma sequência de decisões.

Foi assim que comecei a usar guards composáveis no frontend. Cada guard envolve o handler, verifica uma pré-condição e decide se a cadeia continua.

No lab, implementei as mesmas ações com guards, early returns e condicionais aninhadas. As três versões tiveram o mesmo comportamento nos 18 cenários avaliados.

Com guards, os handlers ficaram sem branches, porém o conjunto chegou a 93 linhas. A versão com early returns usou 34. Ao adicionar uma política às três ações, os guards evitaram novos branches e centralizaram a tradução do bloqueio. Os três pontos de composição ainda precisaram mudar.

No microbenchmark, os guards foram cerca de 15 vezes mais lentos. A diferença absoluta foi de aproximadamente 0,5 microssegundo por chamada.

Eu continuaria usando um early return para uma condição local. O guard passa a valer o custo quando a mesma pré-condição reaparece em ações diferentes, precisa manter uma ordem e deve bloquear todas elas da mesma forma.

O artigo, a demo interativa, o código e os dados brutos estão no primeiro comentário.

Em que ponto uma pré-condição repetida deixa de ser um `if` local no código de vocês?

#typescript #react #frontend #arquiteturadesoftware #engenhariadesoftware
```

## Primeiro comentário

```text
Artigo completo, com demo interativa, código, metodologia e limitações:
https://lab.synko.digital/pt-br/003-guarded-handlers/?utm_source=linkedin&utm_medium=social&utm_campaign=003-guarded-handlers

Lab reproduzível e dados brutos:
https://github.com/jeandiego/evidence-lab/tree/main/posts/003-guarded-handlers
```

## Checklist antes de publicar

- [ ] Artigo e demo acessíveis na URL acima.
- [ ] Commit com `lab/`, `evidence/` e `post/` enviado para `main` no GitHub.
- [ ] Números do copy conferidos com `evidence/structural-metrics.json`, `evidence/change-amplification.json` e `evidence/runtime-benchmark.json`.
- [ ] Link publicado no primeiro comentário logo após o post.
