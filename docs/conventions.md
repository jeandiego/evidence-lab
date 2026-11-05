# Convenções

## Numeração e slug

`posts/<NNN>-<slug>/`, com `NNN` sequencial em ordem de início (não de publicação) e `slug` em kebab-case, em inglês ou o nome próprio do produto. A numeração da edição é independente do slug público: por exemplo, `posts/008-fyin/` usa `number: "008"` e `slug: fyin`, publicado em `/pt-br/fyin/`. Respeite números já reservados no planejamento local.

## Formatos editoriais

O Lab publica investigações sobre produto, design e engenharia. Uma edição pode ser um experimento medido, uma exploração de produto com protótipos ou um relato fundamentado de decisões e práticas de desenvolvimento, incluindo padrões registrados em skills.

Todo formato explicita a pergunta, o contexto, os materiais disponíveis e os limites do que pode concluir. Não há exigência de números ou benchmarks para uma edição existir. Afirmações quantitativas continuam sujeitas às regras de evidência abaixo. Protótipo navegável não comprova funcionalidade entregue, e um padrão documentado não comprova ganho de produtividade.

## Ciclo de um post

1. `cp -R templates/post-template posts/<NNN>-<slug>`
2. Escrever `post/draft.md` — a pergunta e o argumento em exploração.
3. Preparar os materiais adequados à pergunta: experimento, protótipos, exemplos ou decisões documentadas. Criar `lab/` quando houver código executável.
4. Quando houver medições, guardar dados brutos e ambiente em `evidence/`. Nos outros formatos, registrar fontes, decisões e limitações no README da edição.
5. Escrever `post/post.md`, a fonte canônica. Distinguir observação, interpretação e hipótese; incluir resultados contrários ao argumento quando houver.
6. Quando houver tradução, escrever `post/post.en.md` e revisar. Sem ela, o índice em inglês aponta para o original marcado como português.
7. Escrever `post/linkedin-call.md` — copy do LinkedIn condensado a partir do artigo, sem alterar números nem ressalvas, com o link UTM (`utm_source=linkedin&utm_medium=social&utm_campaign=<NNN>-<slug>`).
8. Registrar o post na tabela do `README.md` da raiz.

## Evidência

- Dado bruto é versionado. Nada de só a média no post e o resto perdido.
- Todo resultado medido carrega o ambiente junto (node, SO, máquina).
- Resultado que favorece o lado "perdedor" é publicado do mesmo jeito.
- O experimento não é construído para provar a tese; é construído para testá-la.

## Independência do post

Cada pasta escolhe sua stack. Nada de dependência entre posts, nada de workspace raiz (a exceção controlada é `site/`, abaixo). Se dois posts precisam da mesma coisa, ela é copiada — duplicação é mais barata que acoplamento aqui.

## Exceção: `site/`

`site/` é o blog do lab (Astro), publicado em `lab.synko.digital`. É a única pasta fora de `posts/` com toolchain própria, e segue regras estritas:

- Lê apenas conteúdo dos posts: `post/post.md`, `post/post.en.md`, `post/assets/` e `evidence/*.json`. Nunca importa código de `lab/`.
- Nenhum post depende de `site/`. Um post continua executável e compreensível sem o site.
- Não existe workspace raiz: `site/` tem seu próprio `package.json` e lockfile, como qualquer lab.
- `linkedin-call.md` e `draft.md` não são publicados.
- Demos interativas entram no site como build estático do próprio lab, nunca por import de código. `demo.kind: live` incorpora a demo de capa; uma apresentação com vários fluxos pode usar um componente do site que carregue os arquivos estáticos em iframe dentro da edição. Snapshots externos são versionados em `public/` e não dependem do checkout original durante o build.
