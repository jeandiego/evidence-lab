# Decisão em avaliação: `GuardedResult`

## Problema

Um guard pode impedir que o handler original execute. Se a função composta preservar exatamente o retorno do handler, o contrato precisa representar esse caminho de alguma maneira.

Para um handler que já retorna `void`, isto é ambíguo:

```ts
const result = await guardedHandler()
```

Sem um resultado explícito, `undefined` pode significar:

- o handler executou e retornou `void`;
- algum guard bloqueou a execução;
- uma implementação esqueceu de retornar o resultado.

## Alternativas consideradas

### Retornar `Value | undefined`

```ts
Promise<Value | undefined>
```

É a alternativa com menor cerimônia, mas não funciona como distinção quando `undefined` é um retorno válido. Também não identifica qual guard bloqueou a ação.

### Lançar uma exceção ao bloquear

```ts
throw new GuardBlockedError(...)
```

Permite preservar o retorno no caminho de sucesso, mas transforma uma decisão esperada — cancelar uma confirmação, estar offline ou não ter acesso — em exceção. Isso mistura controle de fluxo com falha inesperada e exige `try/catch` em consumidores que querem observar o bloqueio.

### Callback global de bloqueio

```ts
composeGuards(handler, guards, { onBlocked })
```

É útil para telemetria, mas não informa o chamador sobre o desfecho. Também cria dois lugares para efeitos de bloqueio: o próprio guard e a composição.

### União discriminada

```ts
type GuardedResult<Value> =
  | { status: 'executed'; value: Value }
  | { status: 'blocked'; guard: string; reason?: unknown }
```

Adiciona um wrapper no caminho de sucesso, mas representa todos os desfechos esperados sem confundi-los com exceções.

## Ergonomia observada

### Evento que ignora o resultado

```tsx
<button
  onClick={() => {
    void publishArticle(article).catch(reportError)
  }}
>
  Publicar
</button>
```

O resultado não obriga o consumidor a ramificar quando ele não precisa observá-lo. A rejection ainda precisa ser tratada: `void` descarta o valor da promise, mas não captura erros inesperados.

### Fluxo que usa o retorno da ação

```ts
const result = await publishArticle(article)

if (result.status === 'blocked') {
  return
}

showReceipt(result.value)
```

Existe uma ramificação adicional em comparação com o handler original. Ela representa um caminho que já existe na execução e deixa o narrowing do valor a cargo do TypeScript.

### Observabilidade

```ts
if (result.status === 'blocked') {
  trackBlock(result.guard, result.reason)
}
```

O identificador do guard e o motivo ficam disponíveis sem acoplar a telemetria ao guard concreto.

### Erro inesperado

```ts
try {
  const result = await publishArticle(article)
  // executed ou blocked
} catch (error) {
  // falha inesperada na condição, efeito ou ação
}
```

Exceções permanecem fora de `GuardedResult`. A união representa somente desfechos esperados.

## Trade-offs

- Todo retorno bem-sucedido fica dentro de `{ status: 'executed', value }`.
- `guard` é uma string e não forma automaticamente uma união literal com todos os guards da cadeia.
- `reason` permanece `unknown`; tipar conjuntamente motivos heterogêneos aumentaria bastante a interface.
- Descartar o resultado não captura uma rejection. Event handlers precisam encaminhar erros inesperados para o mecanismo adotado pela aplicação.
- Um guard customizado ainda pode violar o contrato e chamar `next` mais de uma vez.

## Decisão provisória

Manter `GuardedResult` na interface pública do experimento.

Ele resolve uma ambiguidade real para handlers `void`, preserva o valor de handlers com retorno e mantém bloqueios separados de exceções. O custo aparece apenas para consumidores que precisam inspecionar o desfecho — exatamente onde a ramificação é semanticamente relevante.

Não adicionar helpers como `match`, `unwrap` ou callbacks globais nesta etapa. A união discriminada e o narrowing nativo do TypeScript são suficientes para os casos atuais.
