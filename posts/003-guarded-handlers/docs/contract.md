# Contrato proposto para handlers com guards

## Objetivos

O contrato deve:

- funcionar sem React;
- preservar os argumentos e o retorno da ação;
- aceitar condições síncronas e assíncronas;
- permitir que a condição inspecione os argumentos da ação;
- diferenciar ação executada, ação bloqueada e erro inesperado;
- respeitar a ordem declarada dos guards;
- oferecer uma integração React sem esconder a semântica de closures e dependências.

## Não objetivos

- substituir autorização ou validação no servidor;
- capturar silenciosamente exceções da condição ou do handler;
- garantir identidade estável quando o consumidor recria o handler ou os guards;
- transformar qualquer condição local em uma abstração compartilhada.

## Tipos fundamentais

```ts
type MaybePromise<Value> = Value | Promise<Value>

type Handler<Args extends unknown[], Value> =
  (...args: Args) => MaybePromise<Value>

type GuardBlocked = {
  status: 'blocked'
  guard: string
  reason?: unknown
}

type GuardExecuted<Value> = {
  status: 'executed'
  value: Value
}

type GuardedResult<Value> = GuardExecuted<Value> | GuardBlocked

type GuardedHandler<Args extends unknown[], Value> =
  (...args: Args) => Promise<GuardedResult<Awaited<Value>>>

type Guard<Args extends unknown[]> =
  <Value>(next: GuardedHandler<Args, Value>) => GuardedHandler<Args, Value>
```

A cadeia normaliza o resultado para uma `Promise`, porque um único guard assíncrono — como uma confirmação — torna assíncrona toda a execução. O valor da ação continua preservado dentro de `GuardExecuted`.

O resultado discriminado evita usar `undefined` para representar bloqueio. `undefined` pode ser um retorno válido do handler e não informa qual política interrompeu a execução.

## Núcleo puro

```ts
function composeGuards<Args extends unknown[], Value>(
  handler: Handler<Args, Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  const execute: GuardedHandler<Args, Value> = async (...args) => ({
    status: 'executed',
    value: await handler(...args),
  })

  return guards.reduceRight(
    (next, guard) => guard(next),
    execute,
  )
}
```

O núcleo não importa React e pode ser declarado em escopo de módulo:

```ts
const publishArticle = composeGuards(
  executePublish,
  [requireOnline, requireConfirmation(publishDialog)],
)
```

Também pode ser usado em testes, serviços de interface ou outros ambientes que trabalhem com callbacks.

### Invariantes

Para:

```ts
composeGuards(handler, [first, second, third])
```

a ordem é:

```text
first → second → third → handler
```

- cada guard recebe os mesmos argumentos do handler;
- um guard que não chama `next` interrompe todas as etapas seguintes;
- o handler executa no máximo uma vez, desde que cada guard respeite o contrato e chame `next` no máximo uma vez;
- erros lançados ou promises rejeitadas propagam para o chamador;
- bloqueio é um resultado esperado, não uma exceção.

O tipo não consegue impedir que um guard chame `next` duas vezes. Essa restrição precisa ser documentada e testada nos guards fornecidos pela infraestrutura.

## Factory para pré-condições

```ts
type GuardDecision =
  | boolean
  | { allow: true }
  | { allow: false; reason?: unknown }

type CreateGuardOptions<Args extends unknown[]> = {
  name: string
  condition: (...args: Args) => MaybePromise<GuardDecision>
  onBlocked?: (
    context: { args: Args; reason?: unknown },
  ) => MaybePromise<void>
}

function createGuard<Args extends unknown[]>(
  options: CreateGuardOptions<Args>,
): Guard<Args> {
  return <Value>(next: GuardedHandler<Args, Value>) => async (...args) => {
    const decision = await options.condition(...args)
    const allowed = decision === true ||
      (typeof decision === 'object' && decision.allow)

    if (allowed) {
      return next(...args)
    }

    const reason = typeof decision === 'object' && decision.allow === false
      ? decision.reason
      : undefined

    await options.onBlocked?.({ args, reason })

    return {
      status: 'blocked',
      guard: options.name,
      reason,
    }
  }
}
```

O booleano mantém simples o caso comum. O objeto permite explicar um bloqueio quando isso for útil:

```ts
const requireOwnership = createGuard<[Document]>({
  name: 'require-ownership',
  condition: (document) =>
    document.ownerId === currentUser.id
      ? true
      : { allow: false, reason: 'not-owner' },
  onBlocked: () => showPermissionMessage(),
})
```

### Erros

`createGuard` não usa `try/catch` por padrão.

- `false` ou `{ allow: false }` representa uma decisão esperada;
- uma exceção representa falha inesperada;
- erros do handler também propagam normalmente.

Logging, telemetry ou recuperação de erros podem ser implementados como um guard específico, mas não devem ser confundidos com uma condição negada.

## Integração com React

```ts
function useGuardedHandler<Args extends unknown[], Value>(
  handler: Handler<Args, Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  return useMemo(
    () => composeGuards(handler, guards),
    [handler, guards],
  )
}
```

O hook existe para compor guards criados durante o render e que podem fechar sobre props, estado e funções do componente:

```tsx
function DeleteButton({ item }: { item: Item }) {
  const { user } = useSession()
  const [requireConfirmation, setRequireConfirmation] = useState(true)

  const deleteItem = useCallback(async (target: Item) => {
    await api.delete(target.id)
  }, [])

  const guards = useMemo(
    () => [
      createGuard<[Item]>({
        name: 'permission',
        condition: (target) => user.canDelete(target),
        onBlocked: () => showPermissionMessage(),
      }),
      createGuard<[Item]>({
        name: 'confirmation',
        condition: (target) =>
          !requireConfirmation || confirmDeletion(target),
      }),
    ],
    [user, requireConfirmation],
  )

  const handleDelete = useGuardedHandler(deleteItem, guards)

  return <button onClick={() => void handleDelete(item)}>Excluir</button>
}
```

Quando `user` ou `requireConfirmation` muda, os guards são recompostos com as closures do render atual. Quando `handler` e `guards` mantêm suas identidades, o hook mantém a identidade da função retornada.

### Por que não esconder guards em uma `ref`

Uma função permanentemente estável que consulta uma `ref` com os guards mais recentes reduziria mudanças de identidade, mas introduziria semântica implícita de “latest value”. Isso também tornaria mais difícil raciocinar sobre qual render produziu a política usada pela ação.

A primeira versão deve seguir o modelo normal de dependências do React. Uma variante de identidade sempre estável só deve ser considerada diante de uma necessidade medida e com contrato próprio.

### `useMemo` ou `useCallback`

Os dois podem expressar a implementação:

```ts
useMemo(() => composeGuards(handler, guards), [handler, guards])
```

ou:

```ts
useCallback(
  (...args: Args) => composeGuards(handler, guards)(...args),
  [handler, guards],
)
```

`useMemo` é preferível aqui porque compõe a cadeia somente quando as entradas mudam. A segunda versão recompõe todos os guards a cada execução do handler.

## Ergonomia e identidade

Esta chamada é correta, mas cria novas referências em cada render:

```tsx
const handleDelete = useGuardedHandler(
  deleteItem,
  [requireOnline(), requireConfirmation(options)],
)
```

O comportamento continua correto. Apenas não existe estabilidade referencial entre renders. Se essa estabilidade for relevante — por exemplo, porque a função é enviada a um filho memoizado — o consumidor deve estabilizar o handler e o array de guards.

O contrato não deve exigir memoização indiscriminada. Ela é uma otimização, não uma condição de correção.

## Nomenclatura recomendada

Manter `Guard` é razoável se a documentação disser explicitamente que ele não representa uma fronteira de segurança.

Para as instâncias, nomes no formato `require...` tornam a leitura mais precisa:

```ts
requireOnline()
requirePermission(canDelete)
requireConfirmation(options)
```

Para as funções públicas:

```ts
composeGuards(handler, guards)
useGuardedHandler(handler, guards)
createGuard(options)
```

`composeGuards` comunica melhor a operação do núcleo que um nome React-specific. `useGuardedHandler` fica reservado à integração com closures reativas.

## Questões ainda abertas

1. `onBlocked` deve receber somente contexto ou também serviços por injeção explícita?
2. Guards de observabilidade e tratamento de erro pertencem ao mesmo conceito ou devem formar outra camada de middleware?
3. Vale oferecer uma composição simples, sem `GuardedResult`, para handlers de UI cujo retorno é sempre ignorado?

## Decisões relacionadas

- [`guarded-result.md`](guarded-result.md): decisão provisória de manter o resultado discriminado na interface pública.
