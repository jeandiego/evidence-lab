# Fyin /lab/fyin/ — extensão do Synko Lab

Modo: Experience, com contexto de leitura. Público: quem acompanha as decisões de produto, design e desenvolvimento. O visitante escolhe um fluxo e experimenta suas ações; o contexto distingue observação e pergunta aberta.

Identidade herdada de DESIGN.md, Base.astro, Header e Footer: Instrument Sans, papel/tinta, fios finos, cantos retos e tema claro/escuro. O iframe conserva Urbanist, lime, animações e moldura originais do Fyin. Não acrescentar uma segunda moldura.

Composição: abertura editorial curta; links de fluxo em linha com quebra; contexto à esquerda e uma única demonstração à direita. No celular, a demonstração antecede o contexto para dar acesso às interações. Fecho com limites e perguntas abertas. A troca de fluxo mantém o foco no link e carrega apenas o fluxo selecionado, reiniciando seu estado. Hash permite voltar/avançar. A navegação usa links com aria-current, atualiza o hash sem deslocar a página e aceita links diretos para cada fluxo. O iframe carrega ao se aproximar da área visível; trocas posteriores reutilizam o mesmo iframe.

A tipografia e os componentes compartilhados permanecem inalterados. Sem imagem gerada ou novo sistema visual. As duas imagens home.png são capturas fornecidas no repositório Fyin, copiadas em 2026-11-05; só Patrimônio ou Cartão é interativo sobre elas.

Os filtros de titular em Patrimônio e Cartão formam um grupo identificado por “Titular”; cada botão expõe sua seleção com aria-pressed, atualizado junto ao estado visual.

Verificação: capturas em /private/tmp/fyin-desktop.png e /private/tmp/fyin-mobile.png; detector da nova página sem achados. Revisão independente: ship; melhoria de estado acessível dos filtros confirmada como resolved em revisão do delta. Documentação conferida por passagem independente.
