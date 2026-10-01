# Convenções

## Numeração e slug

`posts/<NNN>-<slug>/`, com `NNN` sequencial em ordem de início (não de publicação) e `slug` em kebab-case, em inglês.

## Ciclo de um post

1. `cp -R templates/post-template posts/<NNN>-<slug>`
2. Escrever `post/draft.md` — a tese antes dos números.
3. Construir `lab/` e medir.
4. Guardar dados brutos e ambiente em `evidence/`.
5. Escrever `post/post.md` — o artigo final, com os números reais, inclusive os que contrariam a tese. É a fonte canônica.
6. Traduzir para `post/post.en.md` e revisar.
7. Escrever `post/linkedin-call.md` — copy do LinkedIn condensado a partir do artigo, sem alterar números nem ressalvas, com o link UTM (`utm_source=linkedin&utm_medium=social&utm_campaign=<NNN>-<slug>`).
8. Registrar o post na tabela do `README.md` da raiz.

## Evidência

- Dado bruto é versionado. Nada de só a média no post e o resto perdido.
- Todo resultado carrega o ambiente junto (node, SO, máquina).
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
- Demos interativas entram no site como build estático do próprio lab, declarado no frontmatter (`demo.kind`), nunca por import de código.
