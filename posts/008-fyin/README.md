# 008 · Fyin: do grupo no WhatsApp ao produto

Edição de exploração de produto e design. Artigo canônico em `post/post.md`, publicado pela coleção normal do Lab em `/pt-br/fyin/`: índice, navegação, RSS e OG usam o mesmo conteúdo das outras edições.

## Materiais e limites

O relato parte do roteiro autoral `docs/roteiro-publicacoes-fyin.md` do produto Fyin, principalmente as publicações 1–3. O README e o roadmap do produto fundamentaram a apresentação inicial. Nenhuma pesquisa, resultado de uso ou benchmark foi produzido para esta edição. Protótipos demonstram decisões em exploração e usam dados fictícios; não comprovam entrega no app.

A cópia estática versionada está em `site/public/demos/fyin/dia-2/`, com revisão de referência, arquivos e hashes em `snapshot.json`. Execute `node site/scripts/check-fyin.mjs` para conferir a integridade. Para experimentar sem o site, sirva essa pasta como arquivos estáticos; Contas precisa de CSS e engine de Transações. O componente `site/src/components/FyinExplorer.astro` só apresenta os arquivos em iframe.

O número 008 preserva os números 006 (event loop) e 007 (postmortem) previstos no planejamento local existente. `fyin` é o slug público; o número da edição é metadado independente do caminho.

Esta edição substitui a apresentação avulsa `/lab/fyin/`, que redireciona para `/pt-br/fyin/`. O roteiro da publicação 2 permanece material do produto; este artigo novo não é uma reescrita daquele post do LinkedIn.

A navegação por fluxos com contexto tomou como inspiração conceitual o [Prototype Viewer](https://github.com/appariciojunior/prototype-viewer), sem dependência ou cópia do sistema.
