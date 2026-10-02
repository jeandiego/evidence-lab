# Caso real sanitizado para o artigo

Este exemplo é uma reconstrução genérica de um padrão observado em código de produção. Nomes, entidades, mensagens, rotas e domínio foram substituídos; ele não identifica empresa, produto ou setor de origem.

## Forma problemática

Uma ação de seleção precisa coordenar estado de carregamento, uma campanha opcional, confirmação assíncrona, indisponibilidade parcial e a ação principal:

```ts
async function handleSelectOption(option: Option) {
  setProcessing(option.id)

  const runSelection = async () => {
    if (activeOffer) {
      const confirmed = await confirmOfferChange(activeOffer)
      if (!confirmed) return
    }

    if (option.kind === 'more-options') {
      await openMoreOptions(option)
      return
    }

    await selectOption(option)
  }

  try {
    if (unavailableItems.length > 0) {
      return openUnavailableItemsDialog({
        items: unavailableItems,
        onContinue: runSelection,
      })
    }

    return runSelection()
  } finally {
    clearProcessing()
  }
}
```

O problema não é apenas o tamanho. Para compreender a ação, o leitor precisa manter simultaneamente na memória:

- estado transitório de processamento;
- confirmação de mudança de oferta;
- tratamento de itens indisponíveis;
- desvio para “mais opções”;
- execução da seleção;
- limpeza final.

Nem tudo deve virar guard. O desvio `more-options`, o estado de processamento e o `finally` pertencem ao workflow da ação. As duas políticas que podem ser recorrentes e interrompem a execução são candidatas melhores:

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

Este é um exemplo melhor para o artigo porque também mostra o limite do padrão: guards extraem precondições compartilháveis; eles não transformam todo o workflow em middleware.
