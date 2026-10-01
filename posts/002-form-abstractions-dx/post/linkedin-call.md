---
post: "002"
channel: linkedin
lang: pt-br
status: review
video: ./assets/reel-002.mp4
link: https://lab.synko.digital/pt-br/002-form-abstractions-dx/?utm_source=linkedin&utm_medium=social&utm_campaign=002-form-abstractions-dx
---

# Chamada no LinkedIn · 002

## Mídia

- Arquivo: `assets/reel-002.mp4` (1080×1350, 4:5, 45 s, 3,3 MB). Capa sugerida: `assets/reel-002-poster.jpg` (tomada 03, renders e CPU).
- Subir o vídeo nativamente no LinkedIn, sem link do YouTube, e com as legendas ativadas se houver narração.
- Capa: escolher um frame que mostre um número do resultado, não o título. Conferir antes de subir.

## Copy do post

```text
Criamos uma API declarativa para formulários React. Na tela, um campo ficou assim:

<Field.Text name="email" label="E-mail" />

Tipos, binding e mensagens de erro saíram das telas e foram para uma infraestrutura que o time mantém. Eu queria saber quanto essa escolha custa.

Implementei o mesmo formulário de seis formas: React com useState, RHF + Zod direto, duas versões da mesma abstração local, Vue e AngularJS. Medi linhas por camada, renders, CPU no Chrome e bundle.

O primeiro formulário abstraído custa 71 linhas, contra 34 com RHF direto. A partir daí, cada tela nova custa 21 linhas contra 26.

As duas versões da abstração têm a mesma API pública e mudam só o binding interno. Com useController foram 73 renders e 49,5 ms de CPU. Com register (uncontrolled), 11 renders e 33,1 ms, a 0,4 ms do RHF direto. Neste cenário, o binding explicou a maior diferença entre as duas.

No bundle, a abstração acrescentou entre 716 B e 1,8 KB gzip.

A manutenção continua custando: casts de tipo, novos controles, arrays, campos dependentes e upgrades ficam com a equipe.

O lab mostra uma API menor e consistente para o caminho comum. Ele não demonstra uma DX de framework e não mede produtividade. Quando o formulário sai desse caminho, a API bruta volta a aparecer.

Artigo completo, código e dados brutos no primeiro comentário.

#react #frontend #typescript #dx #engenhariadesoftware
```

## Primeiro comentário

```text
Artigo com o código completo, metodologia, limitações e dados brutos:
https://lab.synko.digital/pt-br/002-form-abstractions-dx/?utm_source=linkedin&utm_medium=social&utm_campaign=002-form-abstractions-dx

Lab reproduzível (npm run dev / measure / benchmark:react):
https://github.com/jeandiego/evidence-lab/tree/main/posts/002-form-abstractions-dx
```

## Checklist antes de publicar

- [ ] Artigo publicado e acessível na URL acima (sem os parâmetros UTM, conferir se abre).
- [ ] Commit com `lab/`, `evidence/` e `post/` enviado para `main` no GitHub.
- [ ] Números do copy conferidos com `evidence/metrics.json` e `evidence/react-performance.json`.
- [ ] Vídeo mostra os mesmos números do copy.
- [ ] Link colado no primeiro comentário logo após publicar.
