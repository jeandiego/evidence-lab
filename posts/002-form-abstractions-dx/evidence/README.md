# Evidências

`metrics.json` é gerado por `npm run measure` e registra ambiente e linhas de fonte não vazias por grupo. O número serve para localizar onde o código ficou, não como ranking de frameworks.

`react-performance.json` é gerado por `npm run benchmark:react`. Ele registra o ambiente, dez execuções após aquecimento, chamadas de render por componente, `TaskDuration` do Chrome e bundles isolados das quatro estratégias React. Render count e tempo de CPU devem ser interpretados junto com a granularidade dos componentes; não são métricas diretas de percepção do usuário.
