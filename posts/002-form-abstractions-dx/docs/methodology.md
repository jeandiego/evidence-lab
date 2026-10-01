# Metodologia

## Pergunta

Onde fica a complexidade de implementar o mesmo formulário em quatro estratégias React, Vue e AngularJS?

## Contrato comum

Cada versão contém cinco campos (`name`, `email`, `role`, `bio`, `terms`), as mesmas mensagens e regras, submissão bloqueada em caso inválido, normalização de `name` e `bio` e exibição do resultado válido.

## Escolhas por implementação

- React abstraído com Controller usa React Hook Form, Zod, `useCreateForm`, `Field.*` e `useController`.
- React abstraído uncontrolled mantém a mesma interface pública, mas usa `register` e assina apenas o erro de cada campo com `useFormState`.
- React direto usa React Hook Form e Zod no próprio formulário, sem wrappers locais.
- React puro usa apenas inputs controlados, `useState`, atualização imutável e `preventDefault`, seguindo os padrões documentados pelo React.
- Vue usa apenas `v-model` e reatividade do núcleo. A validação fica explícita na aplicação porque o núcleo do Vue não fornece uma solução completa de validação de formulários.
- AngularJS usa `ngModel`, diretivas de validação e o estado do form controller. A normalização final continua no controller.

## Métrica de autoria

O script conta linhas não vazias e ignora comentários de linha. Os grupos são deliberadamente separados:

- `reactAbstractedConsumer`: superfície vista por quem usa a abstração;
- `reactAbstractedInfrastructure`: custo local compartilhável dos wrappers;
- `reactUncontrolledConsumer`: superfície da variante uncontrolled;
- `reactUncontrolledInfrastructure`: custo dos wrappers com `register`;
- `validationSchema`: schema compartilhado pelas três versões com Zod;
- `reactRHFZodConsumer`: uso direto de RHF e Zod;
- `reactUseStateConsumerAndValidation`: estado, binding e validação sem bibliotecas de formulário;
- `vueConsumerAndValidation`: template, estado e validação no mesmo SFC;
- `angularConsumerAndValidation`: template declarativo e controller.

O CSS, os arquivos de montagem, o shell da página, lockfile e configuração de build ficam fora. A métrica indica localização de código, não produtividade.

Há duas leituras:

- custo total do primeiro formulário: abstração com Controller 71 linhas (`21 + 42 + 8`), abstração uncontrolled 72 (`21 + 43 + 8`), RHF+Zod direto 34 (`26 + 8`), `useState` 37, Vue 27 e AngularJS 43;
- custo marginal após a infraestrutura existir: ambos os consumidores abstraídos têm 21 linhas, contra 26 no uso direto de RHF+Zod.

A diferença marginal de cinco linhas neste formulário simples é pequena. A abstração se justifica mais pela consistência, tipos e manutenção centralizada do que por redução bruta de linhas.

## Renderização e performance

As quatro versões React percorrem o mesmo cenário automatizado no Chrome: preencher `name`, `email` e `bio`, selecionar `role`, aceitar `terms` e submeter. Uma execução de aquecimento é descartada e dez amostras são registradas.

O benchmark mede três dimensões separadas:

- chamadas de funções de render, instrumentadas explicitamente por componente;
- `TaskDuration` acumulado pelo Chrome durante o cenário, apresentado como mediana e p95;
- JavaScript de produção minificado de cada versão isolada, em bytes e gzip.

O ambiente medido foi Apple M3 Pro, Chrome 143, Node 25.9, React 19.3, React Hook Form 7.89 e Zod 4.6.5. O script reproduzível é `lab/scripts/benchmark-react.mjs`; os dados brutos estão em `evidence/react-performance.json`.

| Estratégia React | Chamadas de render | CPU mediana | CPU p95 | Bundle gzip |
|---|---:|---:|---:|---:|
| Abstração · Controller | 73 | 49,523 ms | 53,259 ms | 107.389 B |
| Abstração · uncontrolled | 11 | 33,061 ms | 38,418 ms | 106.257 B |
| RHF + Zod direto | 2 | 32,703 ms | 37,544 ms | 105.541 B |
| `useState` | 63 | 71,190 ms | 89,850 ms | 69.763 B |

As chamadas não têm o mesmo peso. Na variante Controller, 72 das 73 são renders localizados nos wrappers e apenas uma é do `App`. Na uncontrolled, cada um dos cinco wrappers renderiza duas vezes e o `App`, uma vez: 11 no total. Na versão `useState`, as 63 chamadas renderizam o `App` inteiro. Contar renders sem identificar granularidade produz uma comparação enganosa.

A abstração com Controller adicionou 1.848 bytes gzip sobre RHF+Zod direto; a uncontrolled, 716 bytes. O `useState` evitou as bibliotecas e entregou 35.778 bytes gzip a menos que RHF+Zod direto. Neste formulário, a variante uncontrolled ficou próxima do uso direto em CPU apesar dos wrappers. O overhead maior observado antes pertence principalmente à decisão de controlar os campos, não à abstração como categoria.

## Limitações

- AngularJS está fora de suporte oficial e aparece como referência histórica, não recomendação.
- A implementação reduzida não reproduz toda a acessibilidade e todos os controles de um design system de produção.
- Validação em blur/change e detalhes de touched não são idênticos entre stacks.
- Linhas não capturam dificuldade de tipos, familiaridade da equipe, performance ou custo de upgrades; bundle e execução são medidos separadamente.
- Vue pode adotar bibliotecas de validação e AngularJS também pode receber abstrações locais; o experimento compara decisões escolhidas, não limites absolutos.
- `TaskDuration` é tempo de CPU comparativo do cenário, não INP, latência percebida ou duração exclusiva do React.
- A instrumentação conta chamadas de funções, não commits do React; o build comum não habilita o Profiler de produção.
- O benchmark não usa `StrictMode`, que duplicaria renders em desenvolvimento.
- Dez amostras em uma máquina são adequadas para este contraste local, não para generalização entre dispositivos e aplicações.
