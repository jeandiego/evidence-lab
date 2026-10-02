# Guards para handlers no frontend: quando uma pré-condição vira arquitetura?

Um `if` no começo de um handler não é um problema:

```tsx
function handleOpen() {
  if (!selectedItem) return
  openItem(selectedItem)
}
```

A regra é curta, específica daquela interação e está onde eu esperaria encontrá-la. Extrair esse trecho só adicionaria um conceito novo.

O cenário muda quando conectividade, permissão e confirmação reaparecem em ações diferentes:

```ts
async function handleDelete(article: Article) {
  if (!isOnline()) {
    showOfflineMessage()
    return
  }

  if (!canDelete(article)) {
    showPermissionMessage()
    return
  }

  if (!await confirmDeletion(article)) return
  await deleteArticle(article)
}
```

Conectividade, permissão e confirmação também podem aparecer ao publicar, arquivar ou alterar outro recurso. Se cada handler monta a sequência por conta própria, acaba repetindo a ordem das verificações, a resposta ao bloqueio e a decisão sobre o que ainda pode executar.

Foi nesse contexto que usei guards composáveis para handlers em uma aplicação real. Para mim, a composição deixou a leitura mais leve. Eu conseguia ver a sequência de requisitos no ponto de uso e chegar à ação sem carregar tantos desvios na cabeça. O lab não mede essa percepção, nem produtividade ou redução de bugs.

## O contrato

Um guard recebe a próxima função da cadeia e devolve outro handler. Ele pode chamar `next` e permitir que o fluxo continue ou retornar um bloqueio sem executar as etapas seguintes:

```ts
type GuardedResult<Value> =
  | { status: 'executed'; value: Value }
  | { status: 'blocked'; guard: string; reason?: unknown }

type GuardedHandler<Args extends unknown[], Value> =
  (...args: Args) => Promise<GuardedResult<Awaited<Value>>>

type Guard<Args extends unknown[]> =
  <Value>(next: GuardedHandler<Args, Value>) =>
    GuardedHandler<Args, Value>
```

A composição é uma redução da direita para a esquerda:

```ts
function composeGuards<Args extends unknown[], Value>(
  handler: (...args: Args) => Value | Promise<Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  const execute: GuardedHandler<Args, Value> = async (...args) => ({
    status: 'executed',
    value: await handler(...args),
  })

  return guards.reduceRight((next, guard) => guard(next), execute)
}
```

Para `composeGuards(handler, [online, permission, confirmation])`, a ordem é:

```text
online → permission → confirmation → handler
```

Os mesmos argumentos atravessam a cadeia. Se `permission` não chamar `next`, a confirmação e o handler ficam de fora. Um bloqueio esperado vira um valor; erros inesperados continuam como exceções.

Essa distinção importa em handlers que retornam `void`. Sem um resultado explícito, `undefined` poderia indicar que a ação executou ou que algum guard a bloqueou. A união discriminada envolve o resultado de sucesso em um objeto, preserva o valor da ação e identifica a política que interrompeu o fluxo:

```ts
const result = await publishArticle(article)

if (result.status === 'executed') {
  showReceipt(result.value)
}
```

Uma falha na API, na condição ou no efeito de bloqueio rejeita a promise normalmente. Cancelar uma confirmação não é tratado como exceção.

## As políticas no ponto de uso

No lab, publicar, arquivar e excluir artigos compartilham parte das políticas:

```ts
return {
  publish: composeGuards(execute('publish'), [
    online,
    editorialLock,
    permission('publish'),
    content,
    confirmation('publish'),
  ]),
  archive: composeGuards(execute('archive'), [
    online,
    editorialLock,
    permission('archive'),
  ]),
  delete: composeGuards(execute('delete'), [
    online,
    editorialLock,
    permission('delete'),
    confirmation('delete'),
  ]),
}
```

A lista registra quais políticas protegem cada ação e em que ordem. Isso continua sendo uma decisão do desenvolvedor. Verificar a conexão antes de abrir uma confirmação produz uma experiência diferente de pedir a confirmação e, depois, informar que a aplicação está offline.

O núcleo é TypeScript puro. No React, o hook recompõe a cadeia quando o handler ou os guards mudam:

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

Com isso, o hook segue a semântica normal de closures do React. Se o estado ou as props mudarem, o consumidor precisa recriar os guards com as dependências corretas. A função retornada mantém a identidade enquanto `handler` e `guards` mantiverem suas referências.

Também incluí exemplos de Angular e Vue para mostrar como uma condição poderia ler estado reativo fora do React. São exemplos ilustrativos, sem build executável ou suporte completo a esses frameworks.

## O experimento

Implementei as mesmas três ações de três formas:

1. guards composáveis;
2. condicionais com early return;
3. condicionais aninhadas num handler monolítico.

As variantes recebem as mesmas dependências e retornam o mesmo `GuardedResult`. A matriz compara o resultado, a ordem exata dos checks e efeitos e a propagação de erros. Foram 18 cenários aplicáveis, com 54 observações. As três implementações se comportaram da mesma forma em todos os casos, condição necessária para que a comparação estrutural faça sentido.

## Onde a complexidade ficou

As métricas estruturais foram extraídas do AST com TypeScript:

| Variante | Linhas não vazias | `if` | Pontos de decisão | Aninhamento máximo | Referências a políticas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Guards (handlers) | 40 | 0 | 0 | 0 | 5 |
| Guards (infraestrutura) | 53 | 1 | 5 | 1 | 0 |
| Early return | 34 | 12 | 12 | 1 | 12 |
| Monolítico | 62 | 12 | 12 | 5 | 12 |

Nesta amostra, os handlers e a infraestrutura dos guards somam 93 linhas, contra 34 da versão com early returns. A abstração custa 53 linhas antes de ser reutilizada. Em troca, a tradução das condições de domínio para bloqueios sai dos três handlers e fica na infraestrutura. O ponto de composição ainda decide quais políticas usar e em qual ordem.

A versão com early returns é a menor e mantém o aninhamento em um nível. Eu escolheria essa forma enquanto a repetição fosse pequena ou se cada ação precisasse responder de um jeito diferente à mesma condição.

## O que acontece quando surge uma nova política

Para observar uma mudança, congelei o estado anterior das três variantes e defini o protocolo antes da implementação: adicionar `editorial-lock` depois de conectividade e antes de permissão em publicar, arquivar e excluir.

| Variante | Handlers tocados | Traduções `allow/block` | Wiring | Branches adicionados | Aninhamento | Diff `+/-` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Guards | 3 | 1 | 3 | 0 | 0 → 0 | +4/−1 |
| Early return | 3 | 3 | 0 | 3 | 1 → 1 | +3/−0 |
| Monolítico | 3 | 3 | 0 | 3 | 4 → 5 | +33/−21 |

As três abordagens tocaram os três handlers, então os guards não reduziram o número de pontos de composição alterados. Eles centralizaram a tradução de `allow/block` e evitaram novos branches nos handlers. Ainda foi necessário adicionar a política às três listas.

Nos early returns, a alteração física foi menor: três linhas adicionadas, uma decisão completa em cada handler. Na versão monolítica, inserir uma etapa no meio da árvore exigiu reestruturar os blocos e elevou o aninhamento máximo de quatro para cinco.

## O custo em execução

Um microbenchmark isolou o caminho síncrono de sucesso de publicar, mantendo o contrato assíncrono. Em nove amostras de 20 mil operações, depois do aquecimento:

| Variante | Mediana | p95 entre amostras |
| --- | ---: | ---: |
| Guards | 551 ns/op | 676 ns/op |
| Early return | 37 ns/op | 57 ns/op |
| Monolítico | 36 ns/op | 55 ns/op |

Ambiente: Apple M3 Pro, Node 24.11.1, macOS arm64.

No teste isolado, a versão com guards foi cerca de 15 vezes mais lenta que as alternativas. A proporção parece grande, mas a diferença absoluta foi de aproximadamente 0,5 microssegundo por chamada, ou meio milionésimo de segundo.

Há um custo para encadear e aguardar as etapas, porém ele é muito pequeno em termos absolutos. O benchmark isola apenas essa orquestração. Um handler real costuma renderizar a interface, abrir um diálogo, acessar a rede ou fazer outro tipo de I/O, operações que acontecem em escalas bem maiores. Por isso, estes números não permitem concluir que o usuário perceberia alguma diferença.

## Nem todo workflow deve virar guard

O padrão nasceu de um caso em que uma ação real misturava estado de processamento, confirmação assíncrona, indisponibilidade parcial, um desvio para “mais opções”, a seleção e a limpeza num `finally`.

Colocar tudo numa cadeia trocaria um handler difícil por um middleware difícil. O desvio de fluxo, o estado transitório e a limpeza pertenciam à ação. As políticas recorrentes eram candidatas melhores: confirmar uma mudança e tratar itens indisponíveis.

```ts
const selectWithPolicies = composeGuards(selectOption, [
  requireOfferChangeConfirmation(activeOffer),
  requireAvailableItems({
    unavailableItems,
    openDialog: openUnavailableItemsDialog,
  }),
])

async function handleSelectOption(option: Option) {
  setProcessing(option.id)

  try {
    if (option.kind === 'more-options') {
      return openMoreOptions(option)
    }

    return await selectWithPolicies(option)
  } finally {
    clearProcessing()
  }
}
```

Nesse caso, os guards extraem as pré-condições compartilháveis e o restante do workflow continua no handler.

## O limite de segurança

Um guard no frontend controla o fluxo da interface. Ele pode evitar uma requisição desnecessária, explicar um bloqueio ou pedir confirmação. Qualquer pessoa ainda pode contornar o cliente.

Autorização, integridade e validações relevantes continuam obrigatórias no backend. Um `requirePermission()` no navegador é uma decisão de UX: ele antecipa uma resposta que o servidor também precisa garantir.

## Quando a abstração se paga

Eu consideraria extrair um guard quando:

- a pré-condição aparece em ações diferentes;
- o produto precisa responder da mesma forma quando ela bloqueia;
- a ordem em relação a outras políticas faz parte do comportamento;
- a composição deixa os requisitos da ação claros no ponto de uso;
- a política pode ser testada sem conhecer a tela.

Se a condição pertence a um único handler e cabe em um early return, eu manteria o `if` local.

A versão com guards usou mais código e foi mais lenta no teste isolado. As 53 linhas de infraestrutura, o resultado embrulhado e a disciplina exigida do time compraram centralização e composição explícita. Quando adicionei uma política, não precisei repetir a tradução do bloqueio, embora ainda tenha alterado os três pontos de composição.

Eu continuaria usando um `if` para uma condição local. Quando a mesma pré-condição aparece em várias ações, precisa manter uma ordem e deve bloquear todas elas da mesma forma, tratá-la como uma peça da arquitetura começa a fazer sentido.

## Limitações

- O domínio editorial é pequeno e controlado; não representa a evolução de uma aplicação por meses.
- Linhas, branches e aninhamento descrevem a amostra. Não medem legibilidade, qualidade nem produtividade.
- O experimento de mudança adiciona uma política a três handlers. Outros tipos de mudança podem favorecer outra estrutura.
- O microbenchmark isola orquestração e não prevê latência percebida no frontend.
- Os testes demonstram ordem, short-circuit, tipos, closures e identidade sob as condições avaliadas; não provam redução de bugs num time.
- Um guard customizado ainda pode violar o contrato e chamar `next` mais de uma vez.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/003-guarded-handlers/lab
npm install
npm run typecheck
npm test
npm run evidence
npm run dev
```

Os dados brutos e a metodologia estão em [`evidence/`](../evidence/). O contrato completo está em [`docs/contract.md`](../docs/contract.md), e a decisão sobre `GuardedResult`, em [`docs/guarded-result.md`](../docs/guarded-result.md).
