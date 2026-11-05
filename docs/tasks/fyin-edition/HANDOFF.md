State: DONE

Nova edição e integração em implementação. Próximo passo: atualizar convenções e descrições editoriais; validar indexação, interações e rotas.

## Checkpoint

Artigo canônico 008/fyin criado e integrado à coleção, com explorador reutilizado no layout editorial. Convenções, PRODUCT, README e descrições PT/EN foram atualizados para a ampliação editorial. Materiais qualitativos são aceitos; a regra para afirmações quantitativas permanece.

PASS: build, checker Astro (0 erros/0 warnings/32 hints), integridade do snapshot (30 arquivos), check-fyin-edition (metadados, índices PT/EN, RSS PT/EN, OG, sitemap, navegação e redirect). Smoke Chrome 1440/375/320px passou para os quatro fluxos, teclado, ações, query states e overflow. Nenhum erro JS, recurso ausente ou requisição externa nos testes locais.

Capturas /private/tmp/fyin-edition-{desktop,mobile}.png inspecionadas. Scripts de sessão /private/tmp/fyin-edition-{verify,navigation}.cjs. Revisão independente: ship, sem achados; delta do histórico também aprovado. Documentação específica conferida. PR em rascunho: https://github.com/jeandiego/evidence-lab/pull/3
Preview validado: https://6d5ffa78.evidence-lab-5ky.pages.dev/pt-br/fyin/
Preview da branch: https://codex-fyin-edition.evidence-lab-5ky.pages.dev/pt-br/fyin/
Cloudflare Pages concluiu com sucesso. A rota da edição responde HTTP 200 e /lab/fyin/ retorna HTTP 301 para /pt-br/fyin/.

PASS: teste complementar em 1024px: descoberta pela capa da home, hash de seção preservando fluxo ativo, deep link, Back entre fluxos, redirect antigo e regressão de artigos PT/EN antigos. A troca de iframe criava entrada extra no histórico; corrigida com location.replace e deduplicação por loadedUrl.

Próximo passo: revisão humana do artigo e do PR. Nenhum merge ou deploy de produção foi realizado nesta tarefa. As futuras skills mencionadas são pauta editorial, não implementação desta mudança.
