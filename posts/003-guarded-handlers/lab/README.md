# Lab: guarded handlers

Primeiro slice executável do contrato descrito em [`../docs/contract.md`](../docs/contract.md).

## Executar

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run evidence
```

## Superfície em avaliação

```ts
composeGuards(handler, guards)
createGuard(options)
useGuardedHandler(handler, guards)
```

`src/ergonomics.ts` mantém implementações equivalentes com condicionais locais e guards. Ele existe para avaliar o custo no call site, não para eleger uma solução universal.

## Demo interativa

A aba **Execução** permite alterar quatro condições:

- conectividade;
- permissão;
- confirmação;
- sucesso ou falha da ação principal.

A pipeline visual e o trace são atualizados pela execução real. Quando um guard bloqueia, as etapas posteriores aparecem como não executadas e não entram no trace. Falhas da ação permanecem separadas de bloqueios esperados.

## Comparação de código

A aba **Código** apresenta o mesmo caso de publicação protegida em três organizações:

- guard composável;
- handler tradicional com early returns;
- handler monolítico com políticas, ação e feedback misturados.

No rodapé, adapters para React, Angular e Vue demonstram que `composeGuards` permanece TypeScript puro. React é a origem do hook; Angular Signals e Vue refs são lidos pelas condições durante a execução.

## O que os testes cobrem

- ordem declarada;
- interrupção no primeiro bloqueio;
- condições e efeitos de bloqueio assíncronos;
- propagação de rejeições assíncronas sem convertê-las em bloqueio;
- preservação de argumentos e retorno;
- distinção entre bloqueio e erro;
- closures do render atual;
- identidade quando as dependências são estáveis.

## Benchmark controlado

`src/benchmark` implementa publicar, arquivar e excluir nas três organizações de código. `npm run evidence`:

1. compara resultado, trace e erro em 54 observações;
2. extrai métricas estruturais do AST TypeScript;
3. mede o overhead isolado do caminho de sucesso.

Os relatórios gerados e os limites de interpretação estão em [`../evidence`](../evidence/README.md). O microbenchmark é deliberadamente secundário: ele não representa tempo de resposta percebido pela pessoa usuária.
