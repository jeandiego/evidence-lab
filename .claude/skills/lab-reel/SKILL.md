---
name: lab-reel
description: Cria o vídeo vertical (4:5, MP4) que leva um post do Synko Lab para o LinkedIn. Usa a página real do lab como espécime, números lidos de evidence/ com movimento orientado a dados, e QA automático de fatos, layout e colisões. Use para "vídeo do post", "reel do lab", "apresentar o resultado no LinkedIn" ou "chamada em vídeo".
---

# Lab Reel

Skill própria do Synko Lab. A especificação completa (linguagem visual, timing, componentes e QA) está em [SPEC.md](SPEC.md); a procedência, em [PROVENANCE.md](PROVENANCE.md). Leia a SPEC antes de montar uma história nova.

**Regra de procedência:** não consulte, copie nem imite skills de terceiros ao evoluir esta skill. Mudanças de estilo partem da marca Synko (`/Users/jeandiego/Dev/synko-lp/app/globals.css`) e desta SPEC.

## Quando usar

Depois que o artigo canônico (`post/post.md`) e as evidências estão estáveis. O vídeo condensa o artigo; ele não descobre resultados novos.

## Fluxo

### 1. Ler o post

Leia `post/post.md`, `post/linkedin-call.md` (copy e arredondamentos já usados), `README.md` e `evidence/*.json`. Liste:

- a afirmação central;
- de 3 a 6 afirmações de apoio, cada uma com o número que a sustenta e o caminho no JSON;
- as ressalvas que precisam acompanhar esses números.

### 2. Mapear a página

Com o lab rodando, leia a geometria das seções (`getBoundingClientRect`) e os estados que a página oferece (abas, estratégias). Para cada afirmação, escolha:

- `frame`: a região que prova a afirmação;
- `focus`: o recorte que recebe o contorno;
- `swap`: o estado em que a página mostra o "depois", quando a afirmação é uma comparação.

### 3. Propor a história

Mostre uma tabela e confirme com o autor antes de construir:

| # | eyebrow | claim | readouts (fact → caminho) | marks | frame / swap |
|---|---|---|---|---|---|

Critérios:

- uma afirmação por tomada;
- claim de até 3 linhas a 54 px;
- sub de até 2 linhas;
- textos do autor reaproveitados quando já existirem (linkedin-call, post);
- a capa abre com a pergunta ou o gancho, porque vira thumbnail;
- o fecho traz a tese.

### 4. Montar no lab

Copie o kit uma vez por lab (labs são independentes; a duplicação é intencional):

```
kit/reel/{core,probe,view,run}.ts  →  <lab>/src/reel/
kit/reel/main.example.ts           →  <lab>/src/reel/main.ts   (ajuste os imports de fonte do lab)
kit/reel.html                      →  <lab>/reel.html
kit/reel.mjs                       →  <lab>/scripts/reel.mjs
```

Depois:

- **Escreva** `<lab>/src/reel/story.ts` com `defineStory`, `facts`, `say`, `sum` e `lit`.
- **Configure:**
  - `vite.config.ts`: `server: { fs: { allow: ['..'] } }`, para importar `../evidence`;
  - `tsconfig.json`: `"resolveJsonModule": true`.
- **Adicione scripts** ao `package.json`:
  - `reel:check` → `node scripts/reel.mjs check`
  - `reel:sheet` → `node scripts/reel.mjs sheet`
  - `reel:render` → `node scripts/reel.mjs render --out ../post/assets/reel-<NNN>.mp4`
- **Dependências:** `puppeteer-core`, Google Chrome e `ffmpeg` no PATH.

Regras do `story.ts`:

- Números só via `fact('<arquivo>:<caminho.no.json>', { dec, unit })`. Somas com `sum(...)`. Literais inevitáveis com `lit('002')`.
- A precisão (`dec`) segue o arredondamento que o post já usa. Nunca arredonde de forma diferente da copy publicada.
- `page.apply(doc, state)` precisa ser total e síncrono: aplica todas as chaves do estado (ex.: clicar na aba).
- A fonte de cada tomada cita o arquivo de evidência e a ressalva que muda a leitura.

### 5. QA

1. `npm run reel:check`: zero erros. Os avisos de colisão também precisam ser resolvidos; mude `side`, o alvo ou o `pad`, nunca silencie.
2. `npm run reel:sheet`: leia `.reel/sheet.png` **e** os quadros de cada tomada em tamanho real (`.reel/beats/`). Procure texto sobre texto, marca desalinhada com a página, número ilegível e espécime vazio.
3. Confira um quadro no meio de uma viagem de câmera e um no meio do obturador, extraídos do MP4 com `ffmpeg -ss`.

### 6. Renderizar

`npm run reel:render` gera o MP4 (H.264, yuv420p, 30 fps, faststart) e `-poster.jpg`. A tomada marcada com `poster: true` vira a capa. Escolha uma que mostre um número do resultado.

Atualize:

- o frontmatter `video`/`poster` de `post/post.md` e `post/post.en.md`;
- a seção "Mídia" de `post/linkedin-call.md`;
- o comando de reprodução no README do post.

## Referência

`posts/002-form-abstractions-dx/lab/src/reel/story.ts` tem capa, cinco tomadas (duas com swap) e fecho, com `count`, `shift` e `bars` e as três marcas (`highlight`, `tag`, `bracket`).
