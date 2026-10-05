---
title: "State ownership: sua store global virou uma segunda fonte de verdade?"
emphasis: "segunda fonte de verdade?"
description: "Um snapshot remoto copiado para uma store parece conveniente até o domínio evoluir. O lab mede a divergência e a manutenção criada por essa decisão."
number: "004"
slug: 004-state-ownership
lang: pt-br
date: 2026-10-05
status: review
thesis: "Quando o servidor é o dono do estado, duplicar seu snapshot numa store global transforma consistência em sincronização manual e amplia o risco de divergência conforme o domínio evolui."
tags: [react, zustand, tanstack-query, state-management, architecture, frontend]
demo:
  kind: live
evidence:
  - ../lab/reports/contract-evolution-benchmark.json
  - ../lab/reports/state-ownership-classification.json
  - ../docs/history-audit.md
  - ../docs/sources.md
repo: https://github.com/jeandiego/evidence-lab/tree/main/posts/004-state-ownership
---

Em muitas aplicações React, a store global chega antes da modelagem do estado. Alguns dados precisam atravessar várias telas, então ela parece o lugar natural para guardar usuário, carrinho, draft, unidade, configurações e respostas completas da API.

Parte desses dados pertence ao servidor. Quando também os guardamos numa cópia mutável no cliente, cada mutation precisa manter as duas representações sincronizadas. A escolha da biblioteca importa menos aqui do que a pergunta que ficou para depois: quem é o dono deste estado?

## Uma troca aparentemente simples

O laboratório começa com Luna, coberta por um plano e com atendimento gratuito. O usuário seleciona Thor, cujo atendimento é particular.

O servidor responde com um novo snapshot:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PRIVATE' },
  subtotalCents: 14000,
  discountCents: 2000,
  totalCents: 12000,
  revision: 2,
}
```

Na primeira arquitetura, a interface renderiza uma cópia desse estado guardada no Zustand. A action atualiza apenas o PET:

```ts
applyPetOnly: (serverSnapshot) =>
  set((state) => ({
    snapshot: state.snapshot
      ? { ...state.snapshot, pet: serverSnapshot.pet }
      : serverSnapshot,
  }))
```

Quem escreve a action pode pensar na operação como “trocar o PET” e atualizar o campo que representa essa intenção. O servidor tratou a mesma operação como uma mudança de cobertura, preço, desconto, total e revisão.

A interface termina neste estado:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PLAN' },
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  revision: 1,
}
```

Thor aparece com os dados financeiros de Luna. O TypeScript não reclama, a aplicação não lança uma exceção e todos os campos obrigatórios continuam presentes. Cada valor é válido quando observado sozinho. A combinação é que nunca deveria existir.

## A action descreve o botão, não a transição do domínio

“Trocar o PET” descreve a intenção da interface, enquanto o backend precisa recalcular outras partes do domínio.

O mesmo descompasso aparece quando:

- trocar o paciente muda elegibilidade e convênios;
- adicionar um produto recalcula descontos e total;
- selecionar uma unidade altera disponibilidade e preço;
- mudar a forma de pagamento invalida condições anteriores;
- remover uma transação afeta o draft e outra cópia do carrinho.

O spread só materializa uma decisão anterior: o cliente está reconstruindo uma entidade que o servidor já sabe produzir.

## O domínio cresceu. Quem lembrou da action?

Para observar a evolução do contrato, adicionei dois campos calculados pelo servidor:

```ts
subtotalCents: number
discountCents: number
```

Comparei uma projeção manual, que enumerava os campos conhecidos, com a substituição da query pela resposta canônica.

Na projeção manual, o código continuou compilando e os campos antigos continuaram corretos. Os dois campos novos não entraram na cópia. Surgiram duas divergências, e a action precisaria ser alterada.

Na segunda estratégia, a reconciliação continuou igual:

```ts
queryClient.setQueryData(labStateKey, serverSnapshot)
```

A apresentação ainda precisa mudar para exibir o desconto. A diferença é que a reconciliação não mantém outra lista de campos apenas para atualizar uma cópia remota.

Esse benchmark mede amplificação de mudança na sincronização. Não compara velocidade, memória ou quantidade de renders entre Zustand e TanStack Query.

## Uma aplicação real

O laboratório isola o mecanismo. Para observar sua escala, auditei uma aplicação real que atende mais de 1 milhão de usuários. Fiz a classificação, a evidência por arquivo e linha.
O que encontrei foram 23 operações de sincronização ligadas à store principal:

| Classificação | Operações |
| --- | ---: |
| Evitáveis | 6 |
| Simplificáveis | 13 |
| Legítimas | 2 |
| Inconclusivas | 2 |

Classifiquei como evitável uma operação que copiava estado pertencente ao servidor e que poderia deixar de existir se uma camada de server state mantivesse a representação canônica. Isso pressupõe uma arquitetura alternativa; não seria seguro simplesmente apagar o código atual.

Nos casos simplificáveis, alguma reconciliação continuaria necessária, embora pudesse ser reduzida ou centralizada. Trocar a biblioteca não remove optimistic updates, persistência de workflow nem projeções locais.

Os 19 casos evitáveis ou simplificáveis são pontos onde a arquitetura depende de sincronização manual. Não encontrei 19 bugs em produção. Encontrei 19 lugares onde o risco de introduzir um bug é maior, porque uma mudança no domínio depende de alguém lembrar de manter outra representação coerente.

Entre eles estavam operações que:

- copiavam uma resposta remota completa para a store e também espelhavam seus produtos em `cart`;
- recebiam uma resposta de mutation, mas atualizavam a store a partir do input enviado;
- alteravam o paciente selecionado e sua representação numa coleção separada;
- removiam dados no backend e reconstruíam draft, transações e carrinho;
- preservavam manualmente listas de campos durante limpeza e persistência.

Cada solução faz sentido quando lida isoladamente. Juntas, elas deixam a mesma informação em várias representações e sob vários escritores. Uma mudança no contrato pode chegar a um desses caminhos e não aos demais.

Indo um pouquinho mais a fundo ~sendo insistente até demais~ também revisei os 200 commits mais recentes, excluindo merges. Usei um critério conservador: a mensagem do commit não bastava; o diff precisava mostrar uma correção de estado obsoleto, campos relacionados não sincronizados, cópias locais divergentes ou um campo remoto omitido pelo cliente.

Encontrei 7 commits com esse perfil, 3,5% da janela analisada. Havia correções para limpar uma unidade que permanecia selecionada, restaurar em conjunto forma e contexto de pagamento, reconciliar o carrinho após mudanças feitas em outro fluxo e incluir no contrato consumido um campo remoto que havia ficado de fora.

Isso não prova que uma camada de server state eliminaria os sete commits. Mostra algo mais limitado e verificável: o time precisou voltar, repetidas vezes, aos pontos de sincronização para recuperar coerência entre representações relacionadas.

## O que pertence à store

Eu usaria Zustand sem hesitar para estado que pertence ao cliente, por exemplo:

- interação e apresentação compartilhadas;
- progresso temporário de um fluxo;
- preferências ainda não persistidas;
- coordenação local entre componentes;
- dados sem fonte remota canônica.

Redux, Context e outras stores servem para os mesmos tipos de estado. Já TanStack Query e Apollo tratam dados remotos como server state, mas ainda exigem trabalho depois de algumas mutations: invalidação, refetch, optimistic update, rollback ou atualização coordenada de queries.

Uma ferramenta de server state começa com o servidor como proprietário dos dados remotos. Uma store genérica aceita qualquer dado, inclusive uma cópia desses dados. Quando escolhemos a cópia, também assumimos a responsabilidade de criar e manter seu protocolo de coerência.

## O erro comum e a alternativa

Chamar `set` é apenas o mecanismo. O risco aparece quando recebemos do servidor um snapshot canônico e o reconstruímos campo a campo numa segunda fonte mutável:

```ts
onSuccess: (snapshot) => {
  useScheduleStore.setState((state) => ({
    ...state,
    pet: snapshot.pet,
    coverage: snapshot.coverage,
    totalCents: snapshot.totalCents,
    // alguém lembrou de subtotalCents, discountCents e revision?
  }))
}
```

Se a resposta já representa o recurso confirmado, o cache remoto pode receber o snapshot inteiro:

```ts
onSuccess: (snapshot) => {
  queryClient.setQueryData(['schedule', scheduleId], snapshot)
}
```

Em outros casos, a resposta da mutation não contém tudo o que as telas consultam. A saída pode ser invalidar as queries relacionadas e buscar novamente:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] })
}
```

Nenhuma das duas alternativas torna reconciliação automática em todos os cenários. Elas reduzem a quantidade de código da aplicação encarregado de reconstituir, manualmente, uma entidade que pertence ao servidor.

## Quatro tipos de estado que costumam parar na mesma store

Estas categorias são uma heurística, não uma taxonomia rígida. Uma mesma tela pode usar as quatro ao mesmo tempo, cada uma com um proprietário diferente.

### URL state

Busca, página e ordenação pertencem à URL quando recarregar, voltar ou compartilhar o link deve preservar a seleção:

```ts
const params = new URLSearchParams(window.location.search)
const page = Number(params.get('page') ?? 1)
const orderBy = params.get('orderBy') ?? 'distance'
```

Copiar esses valores para uma store exige sincronizar store, URL e navegação do browser. Se a URL já oferece as propriedades desejadas, ela pode continuar sendo a fonte de verdade.

### Form state

O texto que a pessoa ainda está digitando pertence ao formulário, não ao recurso remoto confirmado:

```tsx
const [coupon, setCoupon] = useState('')

<input
  value={coupon}
  onChange={(event) => setCoupon(event.target.value)}
/>
```

Depois do submit, o formulário pode ser limpo e a resposta confirmada passa para o cache remoto. `dirty`, `touched`, erros de validação e valores ainda não enviados continuam no formulário.

### HTTP/server state

Um agendamento carregado da API tem loading, erro, freshness e invalidação. O servidor é a autoridade; o cliente mantém um cache dessa autoridade:

```ts
const scheduleQuery = useQuery({
  queryKey: ['schedule', scheduleId],
  queryFn: () => getSchedule(scheduleId),
})
```

Esse cache ainda pode ter optimistic updates e rollback. A diferença é que seus mecanismos foram desenhados em torno do ciclo de vida de dados remotos.

### Global/client state

Uma interação compartilhada sem fonte remota canônica é um caso natural para a store:

```ts
const useUiStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
```

O servidor não decide se a sidebar está aberta. Não existe resposta HTTP capaz de tornar esse booleano obsoleto. Aqui, a store é a proprietária do estado, e não uma réplica de outro dono.

## Testar a action não basta

“Mas a action está testada” costuma encerrar a discussão cedo demais. Muitas vezes, o teste prova apenas que o setter fez exatamente o que foi programado para fazer:

```ts
expect(store.pet.id).toBe('thor')
```

Esse teste passa mesmo com o snapshot semanticamente quebrado.

Esse é o detalhe incômodo: a action pode estar funcionando e o domínio pode continuar errado. Um teste verde confirma a implementação da action; não confirma, por si só, a invariância que ela deveria preservar.

Uma invariância mais útil seria:

> Depois de uma operação confirmada pelo servidor, a fonte usada pela interface não pode combinar campos pertencentes a revisões diferentes.

No lab, o diff compara PET, cobertura, preço, subtotal, desconto, total e revisão. Além de verificar o setter, o teste confere se o estado resultante ainda representa uma versão possível do domínio. Um teste de implementação pode continuar existindo, desde que a invariância que a action deveria preservar também esteja coberta.

## A pergunta anterior à ferramenta

Antes de adicionar uma store, eu faria estas perguntas:

1. Quem é a fonte canônica deste dado?
2. Ele representa uma entidade remota ou uma interação local?
3. Precisa refletir alterações feitas em outro lugar ou dispositivo?
4. Quantas representações existirão no cliente?
5. Quantos caminhos poderão escrevê-lo?
6. Se o contrato ganhar um campo amanhã, quais lugares precisarão conhecê-lo?

As respostas definem o mecanismo. Se o servidor é o dono, copiar os dados para uma store transforma consistência em sincronização manual. Conforme o domínio cresce, cada ponto de sincronização é mais um lugar que precisa acompanhar a mudança.

Zustand continua sendo uma opção para o estado que pertence ao cliente. Para o estado remoto, a decisão precisa incluir o custo de manter outra fonte de verdade.

## Limitações

- O domínio do laboratório é pequeno e a divergência é intencional.
- O benchmark adiciona dois campos a uma única action; outras mudanças podem produzir amplificação diferente.
- A auditoria real é uma fotografia da versão analisada e uma classificação arquitetural, não uma contagem de bugs em produção.
- A revisão histórica cobre 200 commits sem merge e usa o commit como unidade; não mede severidade, incidência em produção ou todo o histórico do produto.
- Estado remoto e estado local podem formar casos mistos; ownership nem sempre é binário.
- O experimento não compara performance entre bibliotecas.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/004-state-ownership/lab
npm install
npm run dev
```

Abra `http://localhost:4174/?variant=a1`, troque Luna por Thor e compare o snapshot do servidor com a fonte usada pela interface. Depois execute a variante A2.

Para regenerar o benchmark de evolução do contrato:

```bash
npm run benchmark:contract
```

## Referências

- React: [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) e [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- React: [`<input>`](https://react.dev/reference/react-dom/components/input) e [`<form>`](https://react.dev/reference/react-dom/components/form)
- MDN: [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) e [`History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- TanStack Query: [Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries), [Invalidations from Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) e [Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses)
- Apollo Client: [Caching in Apollo Client](https://www.apollographql.com/docs/react/caching/overview) e [Updating the cache after a mutation](https://www.apollographql.com/docs/react/data/mutations#updating-the-cache-directly)
- Zustand: [Introduction](https://zustand.docs.pmnd.rs/getting-started/introduction) e [`create`](https://zustand.docs.pmnd.rs/apis/create)
- IETF: [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
