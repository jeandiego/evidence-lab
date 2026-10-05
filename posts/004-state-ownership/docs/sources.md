# Fontes para o post 004: state ownership

Este arquivo liga as afirmações didáticas do post a documentação oficial ou especificações primárias. As fontes não demonstram os resultados do laboratório; esses resultados vêm dos artefatos reproduzíveis em `../lab/reports/`.

## Estrutura e ownership do estado em React

### Evitar estado redundante e duplicado

**Afirmação apoiada:** valores que podem ser calculados a partir de props ou de outro estado não devem virar outra variável de estado. Duplicar informação aumenta a possibilidade de esquecer uma atualização.

- React, [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- React, [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

A documentação do React recomenda evitar estado redundante e duplicado e calcular valores derivados durante o render quando possível. Essa é uma analogia direta, em escala menor, para o problema tratado pelo post: duas representações mutáveis da mesma informação exigem sincronização.

### Uma fonte de verdade por informação

**Afirmação apoiada:** cada parte do estado deve ter um proprietário específico. Isso não implica colocar todo o estado no mesmo lugar.

- React, [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components#sharing-state-between-components)
- React, [Thinking in React](https://react.dev/learn/thinking-in-react)

O React descreve esse princípio como uma "single source of truth" para cada parte do estado e recomenda mover o estado para o ancestral comum quando componentes precisam compartilhá-lo.

## Form state

### O formulário pode ser dono do valor em edição

**Afirmação apoiada:** um valor digitado, ainda não confirmado pelo servidor, pode pertencer ao componente ou à camada de formulário. Inputs controlados recebem `value`/`checked` e atualizam seu estado no `onChange`; inputs não controlados podem manter o valor no DOM a partir de `defaultValue`/`defaultChecked`.

- React, [`<input>`](https://react.dev/reference/react-dom/components/input)
- React, [`<form>`](https://react.dev/reference/react-dom/components/form)

Exemplo conceitual:

```tsx
const [email, setEmail] = useState('')

<input value={email} onChange={(event) => setEmail(event.target.value)} />
```

O rascunho pertence ao formulário enquanto o usuário edita. Depois do submit, a resposta remota pode passar a pertencer ao cache responsável pelo estado do servidor.

## URL state

### Filtros navegáveis e compartilháveis podem pertencer à URL

**Afirmação apoiada:** query parameters fazem parte da URL, podem ser lidos e alterados por APIs nativas, e mudanças de URL podem criar entradas no histórico de navegação.

- MDN, [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- MDN, [`History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- React Router, [`useSearchParams`](https://reactrouter.com/api/hooks/useSearchParams)

Exemplo conceitual:

```ts
const params = new URLSearchParams(location.search)
params.set('page', '2')
history.pushState({}, '', `?${params}`)
```

O ponto didático não é que todo filtro deve ir para a URL. Quando voltar/avançar, recarregar, favoritar ou compartilhar precisa preservar a escolha, a URL já fornece essas propriedades e pode ser o dono mais adequado.

## HTTP/server state com TanStack Query

### Queries representam dependências assíncronas identificadas por chave

**Afirmação apoiada:** uma query associa uma chave única a uma fonte assíncrona e usa essa chave para cache, compartilhamento e refetch.

- TanStack Query, [Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
- TanStack Query, [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)

### Uma mutation pode invalidar ou atualizar o cache remoto

**Afirmação apoiada:** depois de uma mutation, o cliente pode invalidar queries relacionadas para refetch ou gravar no cache o objeto completo retornado pelo servidor. O segundo caminho evita uma nova requisição quando a resposta já contém o recurso atualizado.

- TanStack Query, [Invalidations from Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
- TanStack Query, [Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses)
- TanStack Query, [`QueryClient.setQueryData`](https://tanstack.com/query/latest/docs/reference/QueryClient#queryclientsetquerydata)

Exemplos canônicos da documentação:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['todos'] })
}
```

```ts
onSuccess: (data) => {
  queryClient.setQueryData(['todo', { id: data.id }], data)
}
```

Esses mecanismos não eliminam reconciliação, optimistic updates ou rollback. Eles colocam esse trabalho na camada que já mantém o cache das respostas remotas.

## Cache HTTP

### Freshness, validação e invalidação já fazem parte da semântica HTTP

**Afirmação apoiada:** uma resposta fresca pode ser reutilizada sem consultar a origem; respostas stale podem exigir validação; respostas bem-sucedidas a métodos inseguros como `PUT`, `POST` e `DELETE` invalidam a URI alvo em caches HTTP participantes.

- IETF, [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html), especialmente as seções [4.2](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2), [4.3](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.3) e [4.4](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.4)
- MDN, [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

O cache do TanStack Query ou Apollo não é o cache HTTP e não herda automaticamente todas essas regras. A referência serve para mostrar que freshness, validação e invalidação são problemas próprios de dados remotos, não simples setters de interface.

## Estado remoto com Apollo Client

### Cache normalizado reduz duplicação de entidades

**Afirmação apoiada:** o `InMemoryCache` normaliza resultados GraphQL usando identidade de objetos. Consultas diferentes podem referenciar a mesma entidade armazenada, e campos recebidos para uma identidade existente são mesclados no cache.

- Apollo Client, [Caching in Apollo Client](https://www.apollographql.com/docs/react/caching/overview)
- Apollo Client, [Configuring the Apollo Client cache](https://www.apollographql.com/docs/react/caching/cache-configuration)

### Respostas de mutations ajudam a manter o cache coerente

**Afirmação apoiada:** o Apollo recomenda incluir nas respostas da mutation os objetos modificados. Isso permite normalizá-los e atualizar campos de entidades existentes. Alterações estruturais, como inserir um item em uma lista, ainda podem exigir `update`, `cache.modify` ou refetch.

- Apollo Client, [Mutations: updating the cache directly](https://www.apollographql.com/docs/react/data/mutations#updating-the-cache-directly)
- Apollo Client, [Reading and writing data to the cache](https://www.apollographql.com/docs/react/caching/cache-interaction)

## Global/client state com Zustand

### Zustand é uma store genérica de estado e actions

**Afirmação apoiada:** `create` produz uma store/hook capaz de manter primitivas, objetos e funções; actions podem usar `set` para atualizar a store.

- Zustand, [Introduction](https://zustand.docs.pmnd.rs/getting-started/introduction)
- Zustand, [`create`](https://zustand.docs.pmnd.rs/apis/create)
- Zustand, [Flux inspired practice](https://zustand.docs.pmnd.rs/guides/flux-inspired-practice)

Exemplo básico da documentação:

```ts
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

Zustand não precisa ser descrito como problema ou como ferramenta exclusiva para um tipo de estado. Ele oferece um mecanismo genérico. A fronteira entre estado local, global e remoto continua sendo uma decisão da aplicação.

## Mapa curto para a seção prática

| Tipo | Exemplo | Proprietário provável | Fonte de apoio |
| --- | --- | --- | --- |
| URL state | busca, página, ordenação que devem sobreviver a navegação ou compartilhamento | URL/roteador | `URLSearchParams`, History API, `useSearchParams` |
| Form state | texto digitado antes do submit, validação e touched/dirty | formulário/componente | React `<input>` e `<form>` |
| HTTP/server state | recurso consultado, freshness, loading, erro e resposta de mutation | servidor + cache remoto | TanStack Query, Apollo, RFC 9111 |
| Global/client state | preferência ou coordenação compartilhada sem fonte remota canônica | store cliente | Zustand `create` |

Essas categorias são heurísticas. Um mesmo fluxo pode usar mais de uma: a URL guarda o filtro, o formulário guarda o rascunho, o cache remoto guarda o resultado e uma store cliente coordena uma interação compartilhada. A pergunta útil em cada caso é qual camada tem autoridade para escrever e invalidar aquela informação.
