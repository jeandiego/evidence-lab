# site/ — blog do Evidence Lab

Blog em Astro publicado em `https://lab.synko.digital`. Lê o conteúdo dos posts
(`../posts/*/post/post.md` e `post.<lang>.md`) e nunca importa código de `lab/`
(ver `docs/conventions.md`, "Exceção: site/").

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npx wrangler pages dev dist  # serve dist/ como o Cloudflare Pages
```

## Conteúdo

- Um post aparece quando `post/post.md` existe e `status` não é `draft`.
- `post.en.md` (com `lang: en`) cria a versão em inglês. Sem tradução, o índice
  `/en/` lista o original marcado "In Portuguese".
- Links relativos do markdown (`../evidence/…`, `../docs/…`) viram URLs do GitHub.
- `video` e `poster` do frontmatter apontam para `post/assets/`; entram no build com hash.
- A OG image (1200×630) é gerada no build a partir do número, do título e do poster.

## Rotas

Páginas com barra final, no padrão do Cloudflare Pages (`/pt-br` redireciona para `/pt-br/`).

| Rota | Conteúdo |
|---|---|
| `/` | redireciona para `/pt-br/` ou `/en/` conforme o navegador |
| `/<lang>/` | índice de edições |
| `/<lang>/<slug>/` | artigo |
| `/<lang>/rss.xml` | RSS |
| `/og/<lang>/<slug>.png` | OG image |
| `/sitemap-index.xml` | sitemap |

## Publicação

Cloudflare Pages com o subdomínio `lab.synko.digital`. A landing (Vercel) não muda.
É Pages e não Workers porque o DNS de `synko.digital` fica na Vercel: Pages aceita
subdomínio com CNAME em DNS externo; Workers exige o DNS no Cloudflare.

### 1. Cloudflare Web Analytics

1. Cloudflare → **Web Analytics** → **Add a site** → hostname `lab.synko.digital` → **Done**.
2. Em **Manage site**, copie só o `token` do snippet (`data-cf-beacon='{"token": "…"}'`).
   O site já inclui o script; ele só precisa do token.

### 2. Projeto no Cloudflare Pages

1. Cloudflare → **Workers & Pages** → **Create** → aba **Pages** → **Import an existing Git repository**
   → `jeandiego/evidence-lab`.
2. Configuração de build:
   - Project name: `evidence-lab`
   - Production branch: `main`
   - Framework preset: `Astro`
   - Root directory: `site`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables** (Production e Preview):
   - `PUBLIC_CF_BEACON_TOKEN` = token do passo 1
   - A versão do Node vem de `site/.node-version`; `NODE_VERSION` no painel não é necessário.
4. **Save and Deploy**. Teste em `https://evidence-lab-5ky.pages.dev` (o nome que o Pages atribuiu).

Não há `wrangler.json` no site de propósito: com ele, o Pages ignora as variáveis do painel.

O build roda dentro de `site/`, mas o clone é o repositório inteiro, então `../posts` existe.
Cada push na `main` publica de novo; outras branches geram previews.

### 3. Domínio lab.synko.digital

1. No projeto Pages → **Custom domains** → **Set up a custom domain** → `lab.synko.digital`.
   Faça este passo antes do DNS; um CNAME criado antes dá erro 522.
2. Na Vercel (dono do DNS de `synko.digital`) → **Domains** → `synko.digital` → **DNS Records**:
   - Type `CNAME`, Name `lab`, Value `evidence-lab-5ky.pages.dev`
   - Se já existir um registro `lab` (ou se `lab` estiver atribuído a algum projeto Vercel), remova antes.
3. Volte ao Pages e aguarde o domínio ficar **Active** (o certificado SSL é emitido automaticamente).

### 4. Conferir em produção

- `https://lab.synko.digital` → abre o índice no idioma do navegador.
- `https://lab.synko.digital/pt-br/002-form-abstractions-dx/` → artigo, vídeo toca.
- `https://lab.synko.digital/og/pt-br/002-form-abstractions-dx.png` → OG image.
- Colar a URL do artigo no [Post Inspector do LinkedIn](https://www.linkedin.com/post-inspector/) para ver o card.
- Web Analytics mostra a visita em alguns minutos.
