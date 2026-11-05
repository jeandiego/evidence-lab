# Fyin — edição oficial do Lab

Modo: Read no artigo, Experience na demonstração. Público: quem acompanha a construção do produto e as decisões de Jean, sem pressupor familiaridade com a implementação do Fyin.

Direção herdada do Synko Lab: capa de edição com número, título e argumento; corpo com medida de leitura e sumário; navegação entre edições. Sem poster artificial. O explorador existente entra como seção de largura completa antes do rodapé editorial, preservando contexto à esquerda e iframe à direita; no celular, demonstração antes do contexto. Artigo canônico em posts/008-fyin/post/post.md; o componente só apresenta os protótipos estáticos.

Tokens, fontes, regras de foco e tema vêm dos componentes e estilos existentes. O Fyin conserva identidade, moldura e interações dentro do iframe. Não há mudança no sistema visual global, nem comp novo aplicável: a composição é a integração no artigo já estabelecido.

Navegação: o sumário inclui a exploração. Âncoras das seções do artigo preservam o fluxo ativo. Links dos fluxos atualizam hash, aria-current, título do iframe e acesso direto. Apenas uma demonstração é carregada, inicialmente por proximidade, depois na troca de fluxo. Trocas substituem a navegação interna do iframe, sem acrescentar outra entrada ao histórico. A URL carregada é guardada para evitar recargas duplicadas. Os filtros de titular expõem sua seleção por aria-pressed.

Conteúdo: rotina da casa, origem do produto e decisões em exploração. Sem afirmações de pesquisa, eficácia ou funcionalidades entregues. Padrões de Go, design system, testes e Swift aparecem como intenção de futuras edições, conforme pedido. O posicionamento editorial deixa de exigir benchmark de toda publicação; afirmações quantitativas continuam exigindo respaldo.

Capturas da primeira inspeção: /private/tmp/fyin-edition-desktop.png e /private/tmp/fyin-edition-mobile.png. Detector dos alvos alterados sem achados. Revisão independente concluída sem achados; teste adicional de voltar/avançar aprovado. Documentação conferida em passagem independente.
