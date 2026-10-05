# Auditoria de histórico: manutenção de sincronização manual

## Recorte

- Repositório analisado: aplicação real de agendamento, anonimizada no post.
- Janela: 200 commits mais recentes, excluindo merges.
- Unidade de contagem: commit, e não arquivo ou linha alterada.
- Data da análise: 5 de outubro de 2026.

## Critério de inclusão

O commit só entrou na contagem quando o diff mostrava uma correção direta em pelo menos um destes pontos:

1. estado local obsoleto depois de uma operação remota;
2. campos relacionados que precisavam ser atualizados juntos;
3. cópias locais que precisavam ser reconciliadas entre si;
4. campo remoto novo ou existente omitido do contrato consumido pelo cliente.

A mensagem do commit, sozinha, não foi considerada evidência. Features que apenas introduziam comportamento novo, correções exclusivamente visuais e mudanças de cálculo sem relação com sincronização ficaram fora.

## Resultado

Foram encontrados **7 commits em 200**, ou **3,5% da janela**, cujo diff atendia ao critério.

| Caso | Evidência observada no diff |
| --- | --- |
| H01 | limpeza de uma unidade que permanecia obsoleta após concluir o agendamento |
| H02 | limpeza da unidade selecionada em outro caminho de sucesso |
| H03 | restauração de forma de pagamento que precisava restaurar também seu contexto associado |
| H04 | reconciliação do carrinho exibido no checkout depois de mudanças feitas por outro fluxo |
| H05 | inclusão de um campo de cupom que existia na resposta remota, mas não no contrato GraphQL consumido |
| H06 | centralização da atualização conjunta de forma de pagamento e contexto de pagamento |
| H07 | correção de consistência entre pagamento, draft e unidade selecionada |

## Como interpretar

Essa contagem não afirma que 3,5% dos commits da aplicação eram bugs de state ownership, nem que uma biblioteca de server state eliminaria os sete commits. Ela mostra que, mesmo numa janela curta e com um critério conservador, o time precisou voltar repetidamente a pontos de sincronização para manter representações relacionadas coerentes.

O resultado também não deve ser extrapolado para outras bases. Ele é uma evidência histórica complementar à classificação estática das 23 operações e ao benchmark controlado do laboratório.
