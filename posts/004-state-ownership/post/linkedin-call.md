---
post: "004"
channel: linkedin
lang: pt-br
status: review
link: https://lab.synko.digital/pt-br/004-state-ownership/?utm_source=linkedin&utm_medium=social&utm_campaign=004-state-ownership
---

# Chamada no LinkedIn · 004

## Copy do post

```text
Troquei Luna por Thor num lab sobre state ownership.

O nome mudou na tela. A cobertura, o preço, o desconto e a revisão continuaram sendo os de Luna.

O TypeScript aceitou, o teste da action passou e cada campo permaneceu válido quando lido sozinho. Juntos, eles formaram um estado que nunca existiu no domínio.

A action tinha sido modelada como a intenção do botão: “trocar o PET”. O servidor tratava a mesma operação como uma mudança de PET, cobertura, preço, desconto, total e revisão. Ao copiar apenas parte da resposta para a store, o cliente produziu uma combinação visualmente plausível de duas revisões diferentes.

Fiz então o contrato evoluir com dois campos calculados pelo servidor. A projeção manual continuou compilando e deixou os dois de fora. A estratégia que substituía o snapshot remoto pela resposta canônica não precisou mudar.

Quis saber quanto desse trabalho aparecia fora do lab. Auditei uma aplicação usada por mais de 1 milhão de pessoas e encontrei 23 operações de sincronização ligadas à store principal. Classifiquei 19 como evitáveis ou simplificáveis com uma separação diferente entre client state e server state.

Não encontrei 19 bugs. Encontrei 19 pontos onde uma mudança no domínio dependia de alguém lembrar de manter outra representação coerente.

Depois revisei os 200 commits mais recentes, excluindo merges. Em 7 deles, o diff corrigia estado obsoleto, campos relacionados fora de sincronia, cópias divergentes ou um campo remoto omitido pelo cliente. Isso corresponde a 3,5% da janela analisada, não à incidência de bugs em produção nem ao histórico inteiro do produto.

Zustand fez o trabalho que recebeu. O custo apareceu porque pedimos à store que mantivesse uma cópia mutável de dados que continuavam pertencendo ao servidor.

Se a API ganhar um campo amanhã, quantas actions do seu frontend precisam conhecê-lo para que a tela continue coerente?

Artigo, demo reproduzível, código, metodologia e limitações no primeiro comentário.

#react #frontend #zustand #tanstackquery #statemanagement #arquiteturadesoftware
```

## Primeiro comentário

```text
Artigo completo, com demo interativa, auditoria, fontes e limitações:
https://lab.synko.digital/pt-br/004-state-ownership/?utm_source=linkedin&utm_medium=social&utm_campaign=004-state-ownership

Lab reproduzível e dados brutos:
https://github.com/jeandiego/evidence-lab/tree/main/posts/004-state-ownership
```

## Checklist antes de publicar

- [ ] Artigo e demo acessíveis na URL acima.
- [ ] Commit com `lab/`, `docs/` e `post/` enviado para `main` no GitHub.
- [ ] Contagens conferidas: 23 operações, 19 evitáveis ou simplificáveis e 7 de 200 commits.
- [ ] Link publicado no primeiro comentário logo após o post.
