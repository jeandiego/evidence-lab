# Evidência

O lab combina três tipos de evidência. Cada um responde a uma pergunta diferente e não deve ser transformado em uma medida genérica de “código melhor”.

## Protocolo reproduzível

Na pasta `lab`, execute:

```sh
npm test
npm run evidence
```

O experimento usa três ações reais do mesmo domínio editorial:

- publicar: online → permissão → conteúdo válido → confirmação → ação;
- arquivar: online → permissão → ação;
- excluir: online → permissão → confirmação → ação.

Cada ação existe em três variantes: guards compostos, condicionais com early return e condicionais monolíticas aninhadas. Todas recebem as mesmas dependências e retornam o mesmo `GuardedResult`.

## 1. Equivalência comportamental

[`behavior-matrix.json`](./behavior-matrix.json) registra 54 observações: três variantes sobre 18 combinações aplicáveis de ação e cenário. O comparador exige igualdade de:

- resultado discriminado;
- ordem exata dos checks e efeitos executados;
- erro inesperado propagado.

Resultado atual: **18 de 18 casos equivalentes**, totalizando 54 observações após o experimento `editorial-lock`. Essa é uma pré-condição da comparação, não uma vantagem dos guards.

## 2. Estrutura observável

[`structural-metrics.json`](./structural-metrics.json) é extraído do AST pelo TypeScript, sem avaliação manual.

| Variante | Linhas não vazias | `if` | Pontos de decisão | Aninhamento máximo | `return` | Referências a políticas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Guarded — handlers | 40 | 0 | 0 | 0 | 2 | 5 |
| Guarded — infraestrutura reutilizável | 53 | 1 | 5 | 1 | 4 | 0 |
| Early return | 34 | 12 | 12 | 1 | 18 | 12 |
| Monolítico | 62 | 12 | 12 | 5 | 16 | 12 |

A leitura válida é sobre **distribuição da complexidade**: os guards retiram branches de política dos três handlers e concentram a tradução de `allow/block` numa infraestrutura reutilizável, ao custo inicial de 53 linhas não vazias. A seleção e a ordem das políticas continuam sendo decisões declarativas no ponto de composição. Linhas, returns e branches descrevem a amostra; não medem legibilidade, qualidade ou produtividade.

## 3. Overhead isolado

[`runtime-benchmark.json`](./runtime-benchmark.json) mede somente o caminho de sucesso de “publicar”, com políticas síncronas e contrato assíncrono. São nove amostras de 20 mil operações após aquecimento.

Na execução registrada em 2026-10-02:

| Variante | Mediana | p95 entre amostras |
| --- | ---: | ---: |
| Guarded | 551 ns/op | 676 ns/op |
| Early return | 37 ns/op | 57 ns/op |
| Monolítico | 36 ns/op | 55 ns/op |

O pipeline adicionou cerca de 0,5 µs por chamada neste ambiente. Isso caracteriza o custo da composição, mas **não prevê performance percebida no frontend**: renderização, eventos, rede e I/O operam em escalas muito maiores. Por isso, este resultado fica como evidência secundária e não sustenta a tese principal.

O lab não usará linhas de código isoladamente como proxy de produtividade ou qualidade.

## Validação do lab

Em 2026-10-02:

- `npm run typecheck`: passou;
- `npm test`: 5 arquivos e 24 testes passaram;
- o teste React confirmou que o handler observa o guard recomposto após uma mudança de estado;
- o teste de identidade confirmou estabilidade quando `handler` e `guards` mantêm suas referências.
- os testes de `GuardedResult` confirmaram a distinção entre `void` executado e bloqueio, o narrowing do valor sem casts e a propagação separada de erros inesperados.
- a demo foi inspecionada em desktop e em viewport mobile de 390 px;
- foram verificados manualmente o caminho completo e o short-circuit no guard de permissão, incluindo a marcação das etapas posteriores como não executadas.
- os testes de integração cobrem short-circuit com etapas puladas e a distinção visual entre bloqueio e erro inesperado do handler.
- a aba de código foi inspecionada em desktop e 390 px, incluindo a leitura das três implementações;
- os testes confirmam a alternância entre Execução/Código e entre os adapters React/Angular/Vue.
- a matriz automatizada confirmou equivalência de resultado, trace e erro nas 54 observações.

## Limites

Esta validação demonstra o contrato e diferenças estruturais numa amostra controlada. Ela ainda não demonstra ganho de produtividade, manutenção, legibilidade, redução de bugs ou consistência para um time. Essas hipóteses exigiriam estudos com tarefas, participantes e código real ao longo do tempo. A percepção de menor carga cognitiva do autor será apresentada como relato pessoal, separada dos resultados medidos.

## Amplificação de mudança

O [protocolo](./change-amplification-protocol.md) foi congelado antes da implementação. O [relatório resultante](./change-amplification.json) registra:

| Variante | Handlers tocados | Traduções `allow/block` | Wiring | Delta de branches | Aninhamento antes → depois | Diff físico +/− |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Guarded | 3 | 1 | 3 | 0 | 0 → 0 | +4/−1 |
| Early return | 3 | 3 | 0 | +3 | 1 → 1 | +3/−0 |
| Monolítico | 3 | 3 | 0 | +3 | 4 → 5 | +33/−21 |

O resultado é mais específico que “guards reduzem mudanças”: as três variantes tocaram os três handlers. O ganho observado foi **centralizar a tradução da política em `allow/block` sem adicionar branches aos handlers**; o custo de aplicar a política continuou distribuído por três pontos de wiring. Os snapshots baseline, o manifesto de casos e as fontes atuais alimentam o relatório automaticamente; o diff usa LCS e os handlers alterados são identificados pelo AST.

Todas as variantes também compartilham a alteração do contrato de domínio (`+14/−6` linhas), portanto cada abordagem toca dois arquivos de produção: o domínio e sua implementação de handlers. Dos 15 casos anteriores, 12 tiveram o trace atualizado, três casos offline permaneceram inalterados e três novos casos de bloqueio editorial foram adicionados.
