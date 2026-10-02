# Notas editoriais para o artigo

Estas notas registram contexto autoral e limites de afirmação. Elas não são resultados do benchmark.

## Experiência pessoal

Jean percebeu que a composição tornou o código mais legível e reduziu sua carga cognitiva durante a leitura. No ponto de uso, a lista ordenada de guards permitia reconhecer rapidamente os requisitos necessários para que a ação fosse executada.

No artigo, isso deve aparecer em primeira pessoa e ser identificado como experiência do autor, não como conclusão generalizável do lab. O experimento não mede produtividade, legibilidade, redução de bugs ou consistência entre equipes.

## Critério usado na adoção original

Jean não atuava como tech lead quando introduziu o padrão em outra codebase. Ainda assim, adotou critérios próximos aos que seriam esperados numa decisão técnica madura:

- políticas de interação repetidas em ações diferentes;
- ordem de execução relevante;
- bloqueios que precisavam produzir comportamento consistente;
- composição explícita no ponto de uso;
- manutenção do `if` local como escape hatch para condições simples e específicas.

O artigo deve apresentar isso como a maneira pragmática pela qual o padrão foi introduzido, não como mandato arquitetural posterior.

## Adapters de framework

React é a origem da integração testada. Angular e Vue permanecem exemplos ilustrativos para demonstrar que o núcleo é TypeScript puro e que estado reativo pode ser lido pela condição. Eles não são builds executáveis nem evidência de integração completa com esses frameworks. Essa limitação deve ficar explícita na legenda ou no texto do artigo.
