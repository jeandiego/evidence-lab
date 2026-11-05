# evidence-lab

Meu laboratório público de produto, design e engenharia, com os artigos que publico no site e adapto para o LinkedIn.

As edições registram experimentos, protótipos e decisões do processo de construção: problemas de uso, interfaces, padrões e práticas de desenvolvimento. Uma edição pode explorar uma pergunta ou documentar uma decisão sem precisar de benchmark. Quando há uma afirmação quantitativa, ela continua exigindo código, metodologia e dados que a sustentem.

Regra do repositório: **toda afirmação quantitativa de um post precisa apontar para código, metodologia e dados brutos aqui dentro.** Se não dá para reproduzir, não vira número no post.

## Estrutura

```
posts/<NNN>-<slug>/     um post = uma pasta autocontida
templates/post-template/ esqueleto para começar um post novo
docs/                    convenções do repositório
scripts/                 utilitários que valem para todos os posts
site/                    blog do lab (Astro) em lab.synko.digital — lê os posts, não importa labs
```

Cada pasta de post é independente: linguagem, gerenciador de pacotes, toolchain e scripts são livres. O repositório é um monorepo "solto" — não há build unificado, cada post roda por conta própria.

## Anatomia de um post

```
posts/<NNN>-<slug>/
├── README.md        o que o post afirma, como reproduzir, o que ficou de fora
├── post/            texto publicado
│   ├── draft.md     rascunho da investigação
│   ├── post.md      artigo final, publicado em lab.synko.digital
│   ├── post.en.md   tradução revisada do artigo (en-us)
│   ├── linkedin-call.md  copy do post de chamada no LinkedIn + link com UTM
│   └── assets/      imagens, diagramas, capturas
├── lab/             o experimento / código que sustenta o post
└── evidence/        resultados brutos, ambiente, capturas, links
```

`lab/` só existe quando o post tem código executável. `evidence/` reúne medições e dados brutos quando a edição os utiliza; nas demais, o README registra os materiais consultados e os limites da exploração.

## Posts

| # | Post | Estado | Afirmação central |
|---|------|--------|-------------------|
| 001 | [legacy-modernization-lab](posts/001-legacy-modernization-lab/) | rascunho | Modernizar um legado não é atualizar tudo — é descobrir onde o custo compra alguma coisa |
| 002 | [form-abstractions-dx](posts/002-form-abstractions-dx/) | em revisão | Uma abstração local pode dar a React uma DX de framework, mas transfere o custo para a infraestrutura da equipe |
| 003 | [guarded-handlers](posts/003-guarded-handlers/) | em revisão | Guards composáveis centralizam pré-condições recorrentes; para uma condição local, um `if` continua mais simples |
| 005 | [fetch-interceptor-tradeoffs](posts/005-fetch-interceptor-tradeoffs/) | em revisão | Quando N microfrontends renovam o mesmo token por conta própria, a colisão derruba sessões e multiplica chamadas por N; patch no shell e módulo compartilhado resolvem, e a diferença está em quem paga e no que cada um esconde |
| 008 | [fyin](posts/008-fyin/) | em revisão | A rotina de reconstruir a situação financeira da casa como ponto de partida para explorar produto e design |
