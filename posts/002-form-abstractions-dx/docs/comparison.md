# Comparação

| Aspecto | Abstração Controller | Abstração uncontrolled | RHF+Zod direto | React useState | Vue core | AngularJS core |
|---|---|---|---|---|---|---|
| Binding | `useController` nos wrappers | `register` nos wrappers | `register` no consumidor | `value`/`checked` + handlers | `v-model` | `ng-model` |
| Validação | Zod via resolver | Zod via resolver | Zod via resolver | Função da aplicação | Função da aplicação | Diretivas + form controller |
| Erros visuais | Centralizados | Centralizados | Repetidos no JSX | Repetidos no JSX | Repetidos no template | Repetidos no template |
| Custo do primeiro formulário | 71 linhas | 72 linhas | 34 linhas | 37 linhas | 27 linhas | 43 linhas |
| Custo marginal comparável | 21 linhas | 21 linhas | 26 linhas | 37 linhas | 27 linhas | 43 linhas |
| Chamadas de render | 73, localizadas | 11, localizadas | 2 | 63, `App` inteiro | — | — |
| CPU mediana | 49,523 ms | 33,061 ms | 32,703 ms | 71,190 ms | — | — |
| Bundle gzip | 107.389 B | 106.257 B | 105.541 B | 69.763 B | — | — |

## Leitura

React oferece primitives para construir UI, mas não escolhe por si só schema, registro, validação ou apresentação de erros. As quatro versões React tornam o deslocamento de complexidade explícito:

- `useState` mantém todas as decisões na aplicação;
- RHF+Zod transfere registro, estado e validação para o ecossistema;
- as abstrações locais transferem também binding e apresentação de erros para infraestrutura interna; a infraestrutura ainda precisa escolher entre campos controlados e uncontrolled.

Neste formulário simples, a abstração economiza apenas cinco linhas marginais sobre RHF+Zod direto. O código demonstra consistência e um ponto central de evolução, mas o lab não mede o efeito dessas propriedades na produtividade do time.

Vue escolhe mais no nível de binding e reatividade. Ainda assim, chamá-lo de “framework completo de formulários” seria incorreto: neste lab a validação permanece responsabilidade da aplicação.

AngularJS coloca binding, descoberta do formulário e estados como `$dirty`, `$touched`, `$valid` e `$invalid` no próprio framework. Isso reduz decisões para o caso básico, ao custo de uma semântica mais própria do framework e de tecnologia oficialmente descontinuada.

## Tese sustentada

A abstração oferece uma API declarativa para o caminho comum dos formulários e centraliza binding, tipos e apresentação de erros. O experimento não sustenta a expressão “DX de framework”: ele não avalia convenções de aplicação, roteamento, dados, lifecycle, tooling, onboarding ou produtividade.

## Leitura de performance

RHF+Zod direto foi o mais barato em CPU por uma margem pequena sobre a abstração uncontrolled. Com a mesma API pública, a variante com `useController` registrou 73 chamadas e 49,523 ms; a variante com `register`, 11 chamadas e 33,061 ms. O binding explica a maior diferença observada entre as duas abstrações neste cenário. `useState` produziu o menor bundle, porém atualizou o componente inteiro a cada mudança e teve o maior `TaskDuration`.

Isso não cria um ranking universal. Render count não é unidade de velocidade: 72 renders localizados de campos não equivalem a 62 renders adicionais do formulário inteiro. A conclusão limitada ao lab é que a abstração cobra algum custo, mas a decisão continua sendo dominada por consistência, manutenção e complexidade do formulário — não por uma penalidade de performance demonstravelmente relevante aqui.
