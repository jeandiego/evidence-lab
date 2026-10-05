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
Frontend adora discutir qual biblioteca deve ser dona do estado.

Zustand? Redux? Context? TanStack Query?

Essa discussão costuma começar com uma pergunta tarde demais.

Quem é o dono do dado?

Quando o servidor devolve um snapshot completo e a aplicação copia esse snapshot para uma store global, alguém passa a manter duas verdades. Cada mutation vira um pequeno protocolo de sincronização escrito pelo time.

No lab, trocar o PET atualiza corretamente o nome para Thor. A cobertura, o preço, o desconto e a revisão continuam sendo os de Luna.

TypeScript aprova e o teste da action passa. Mesmo assim, a tela combina valores de duas revisões do domínio e parece plausível para quem usa.

Depois fiz o contrato evoluir com dois campos calculados pelo servidor. A projeção manual continuou compilando e esqueceu os dois. A estratégia que substituía o snapshot canônico não precisou mudar.

Também auditei uma aplicação real de agendamento usada por mais de 1 milhão de pessoas:

23 operações de sincronização na store principal.
19 eram evitáveis ou simplificáveis com uma separação melhor entre client state e server state.

A contagem não representa 19 bugs encontrados. Ela marca 19 lugares onde o próximo bug tem mais chance de nascer porque alguém precisa lembrar de atualizar outra cópia.

Olhei também os últimos 200 commits sem merge. Em 7 deles, o diff corrigia diretamente estado obsoleto, campos relacionados fora de sincronia, cópias divergentes ou um campo remoto omitido pelo cliente.

Em 3,5% dessa janela, o time precisou voltar a um ponto de sincronização para recuperar coerência.

Zustand fez exatamente o trabalho que entregamos a ele. Talvez tenhamos entregado trabalho demais.

O erro acontece antes da escolha da biblioteca: começar pela store e decidir ownership depois.

Se a API ganhar um campo amanhã, quantas actions do seu frontend precisam lembrar dele?

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
