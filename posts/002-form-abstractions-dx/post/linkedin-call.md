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

- Arquivo: `assets/reel-002.mp4` (1080×1350, 4:5).
- Subir o vídeo nativamente no LinkedIn, sem link do YouTube, e com as legendas ativadas se houver narração.
- Capa: escolher um frame que mostre um número do resultado, não o título. Conferir antes de subir.

## Copy do post

```text
Criamos uma API declarativa para formulários React.

A tela ficou assim:

<Field.Text name="email" label="E-mail" />

Tipos, binding e mensagens de erro saíram das telas e foram para uma infraestrutura mantida pelo time. Quanto custa essa escolha?

Implementei o mesmo formulário de seis formas: React com useState, RHF + Zod direto, duas versões da mesma abstração local, Vue e AngularJS. Medi linhas por camada, renders, CPU no Chrome e bundle.

O que encontrei:

→ O primeiro formulário abstraído custa 71 linhas. Com RHF direto, 34. Dali em diante, cada tela custa 21 contra 26.

→ A mesma API pública, com dois bindings internos: useController fez 73 renders e 49,5 ms de CPU; register fez 11 renders e 33,1 ms, a 0,4 ms do RHF direto.

→ O overhead de bundle da abstração foi de 716 B a 1,8 KB gzip.

Neste cenário, o binding explicou a maior diferença entre as duas abstrações. O perfil uncontrolled ficou próximo do RHF direto.

O custo de manutenção continua: casts de tipo, novos controles, arrays, campos dependentes e upgrades ficam sob responsabilidade da equipe.

O lab demonstra uma API menor e consistente para o caminho comum. Não demonstra uma DX de framework nem mede produtividade. Quando os formulários escapam desse caminho, a API bruta volta a aparecer.

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
