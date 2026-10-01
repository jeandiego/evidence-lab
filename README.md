# evidence-lab

Meu laboratório de estudos e exploração — front, backend, infra — e o repositório de evidências dos posts que eu publico no LinkedIn.

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
│   ├── draft.md     rascunho, antes dos números
│   ├── post.md      artigo final, publicado em lab.synko.digital
│   ├── post.en.md   tradução revisada do artigo (en-us)
│   ├── linkedin-call.md  copy do post de chamada no LinkedIn + link com UTM
│   └── assets/      imagens, diagramas, capturas
├── lab/             o experimento / código que sustenta o post
└── evidence/        resultados brutos, ambiente, capturas, links
```

`lab/` só existe quando o post tem código. `evidence/` sempre existe.

## Posts

| # | Post | Estado | Afirmação central |
|---|------|--------|-------------------|
| 001 | [legacy-modernization-lab](posts/001-legacy-modernization-lab/) | rascunho | Modernizar um legado não é atualizar tudo — é descobrir onde o custo compra alguma coisa |
| 002 | [form-abstractions-dx](posts/002-form-abstractions-dx/) | em revisão | Uma abstração local pode dar a React uma DX de framework, mas transfere o custo para a infraestrutura da equipe |
