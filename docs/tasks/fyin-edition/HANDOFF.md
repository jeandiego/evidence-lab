State: IN_PROGRESS

Nova edição e integração em implementação. Próximo passo: atualizar convenções e descrições editoriais; validar indexação, interações e rotas.

## Checkpoint

Artigo canônico 008/fyin criado e integrado à coleção, com explorador reutilizado no layout editorial. Convenções, PRODUCT, README e descrições PT/EN foram atualizados para a ampliação editorial. Materiais qualitativos são aceitos; a regra para afirmações quantitativas permanece.

PASS: build, checker Astro (0 erros/0 warnings/32 hints), integridade do snapshot (30 arquivos), check-fyin-edition (metadados, índices PT/EN, RSS PT/EN, OG, sitemap, navegação e redirect). Smoke Chrome 1440/375/320px passou para os quatro fluxos, teclado, ações, query states e overflow. Nenhum erro JS, recurso ausente ou requisição externa nos testes locais.

Capturas /private/tmp/fyin-edition-{desktop,mobile}.png inspecionadas. Scripts de sessão /private/tmp/fyin-edition-{verify,navigation}.cjs. Revisão independente: ship, sem achados; delta do histórico também aprovado. Documentação específica conferida. Preview remoto e novo PR pendentes.

PASS: teste complementar em 1024px: descoberta pela capa da home, hash de seção preservando fluxo ativo, deep link, Back entre fluxos, redirect antigo e regressão de artigos PT/EN antigos. A troca de iframe criava entrada extra no histórico; corrigida com location.replace e deduplicação por loadedUrl.

Próximo passo: commit/push, PR e confirmação do Cloudflare Pages. Não fazer merge.
