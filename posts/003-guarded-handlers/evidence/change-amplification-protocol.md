# Protocolo: amplificação de mudança

Status: **congelado antes da implementação**
Data: 2026-10-02

## Pergunta

Quando uma política transversal é adicionada a três ações existentes, como a mudança se distribui entre as três organizações de código?

O experimento não tenta medir “facilidade”, produtividade ou tempo humano. Ele mede somente a superfície observável da alteração.

## Baseline

As três variantes comportamentalmente equivalentes registradas em [`behavior-matrix.json`](./behavior-matrix.json):

- guard composável;
- condicionais com early return;
- condicionais monolíticas aninhadas.

As ações são publicar, arquivar e excluir.

## Mudança congelada

Adicionar a política `editorial-lock` às três ações.

Contrato:

1. deve executar depois de `online` e antes de `permission`;
2. quando o artigo estiver bloqueado editorialmente, retorna `{ status: 'blocked', guard: 'editorial-lock' }`;
3. registra `check:editorial-lock` e depois `blocked:editorial-lock`;
4. permissão, políticas posteriores e ação não podem executar após o bloqueio;
5. quando o artigo não estiver bloqueado, todos os resultados e traces anteriores permanecem equivalentes, exceto pela inserção de `check:editorial-lock`;
6. erros inesperados continuam sendo propagados, não convertidos em bloqueio.

Não é permitido alterar a ordem, remover políticas existentes ou introduzir comportamento adicional para melhorar o resultado de uma variante.

## Implementações permitidas

Cada variante pode usar a organização que seria idiomática dentro do seu próprio modelo:

- **guarded:** declarar um guard reutilizável e compô-lo nas três ações;
- **early return:** adicionar uma checagem local com retorno antecipado em cada handler;
- **monolítico:** adicionar uma checagem no fluxo aninhado de cada handler.

Refatorações não necessárias ao contrato serão contabilizadas e descritas; não serão removidas da medição.

## Critério de equivalência

A implementação modificada só entra na comparação se um teste automatizado confirmar, nas três variantes:

- mesmo `GuardedResult`;
- mesmo trace ordenado;
- mesmo erro propagado;
- short-circuit antes de `permission` no novo cenário;
- preservação dos 15 casos anteriores.

## Métricas primárias

As métricas serão obtidas do diff entre os snapshots `before` versionados e as fontes `after` do benchmark:

| Métrica | Definição |
| --- | --- |
| Arquivos alterados | Arquivos de produção cujo conteúdo mudou. Fixtures, testes, scripts e evidências ficam separados. |
| Handlers alterados | Funções de ação cujo corpo mudou. |
| Locais de decisão alterados | Nós de decisão adicionados ou modificados no AST. Composição declarativa não conta como branch. |
| Locais de wiring alterados | Pontos em que a nova política é ligada a uma ação ou pipeline. |
| Linhas adicionadas/removidas | Diff físico, apresentado como descrição, não como pontuação de qualidade. |
| Aninhamento máximo | Profundidade máxima de `if` antes e depois. |
| Testes afetados | Casos existentes atualizados mais novos casos exigidos pelo contrato. |

“Local” significa um nó ou declaração distinta no AST, não cada linha formatada.

## Métricas derivadas

- **dispersão:** quantidade de handlers e arquivos de produção tocados;
- **localidade da política:** número de lugares que contêm a decisão `editorial-lock`;
- **custo de wiring:** quantidade de lugares que apenas aplicam a política já definida;
- **delta estrutural:** diferença de decisões e aninhamento antes/depois.

Decisão e wiring serão reportados separadamente. Isso é essencial: declarar uma política uma vez, mas aplicá-la explicitamente a três pipelines, não equivale a “uma única alteração”.

## Hipóteses registradas

1. A variante guarded terá uma única implementação da decisão, mas ainda exigirá wiring explícito nas três ações.
2. Early return repetirá a decisão nos três handlers, mantendo aninhamento máximo igual a 1.
3. A variante monolítica repetirá a decisão e aumentará ou preservará o maior aninhamento.
4. O primeiro acréscimo de uma política pode não reduzir arquivos ou handlers tocados; o possível benefício esperado é a separação entre definição e aplicação da política.

Essas hipóteses podem ser refutadas pelos resultados.

## O que não será concluído

O experimento não autoriza afirmações sobre:

- velocidade de desenvolvimento;
- facilidade de leitura;
- redução de bugs em produção;
- preferência de desenvolvedores;
- custo de onboarding.

Esses pontos precisariam de estudo com pessoas e manutenção longitudinal.
