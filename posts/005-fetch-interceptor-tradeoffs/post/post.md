---
title: "Cada microfrontend renova o próprio token: onde essa lógica deveria morar?"
emphasis: "onde essa lógica deveria morar?"
description: "Quando vários microfrontends tentam renovar o mesmo token ao mesmo tempo, uma rotação estrita pode derrubar a sessão e gerar até N chamadas onde uma bastaria. O lab compara um patch no shell e um módulo compartilhado."
number: "005"
slug: 005-fetch-interceptor-tradeoffs
lang: pt-br
date: 2026-10-22
status: review
thesis: "Quando N microfrontends tentam renovar o mesmo token ao mesmo tempo, uma rotação estrita pode derrubar a sessão e gerar até N chamadas onde uma bastaria. Um patch no shell e um módulo compartilhado resolvem a colisão; a diferença está em quem paga o custo e no que cada um esconde."
tags: [single-spa, microfrontends, authentication, jwt, architecture, frontend]
demo:
  kind: video
# Vídeo para o LinkedIn e hero do site; a capa alimenta o card OG.
video: ./assets/reel-005.mp4
poster: ./assets/reel-005-poster.jpg
evidence:
  - ../evidence/summary.json
  - ../evidence/benchmark.json
  - ../evidence/scale-benchmark.json
  - ../evidence/migration-cost.json
  - ../evidence/spike-httplink-fetch.json
  - ../evidence/environment.json
repo: https://github.com/jeandiego/evidence-lab/tree/main/posts/005-fetch-interceptor-tradeoffs
---

Numa aplicação com vários microfrontends conectados, usuários eram deslogados sem motivo aparente. O painel de observabilidade mostrava a mutation de refresh de token falhando numa taxa alta e constante. Vivi esse problema na prática. Nenhuma peça estava errada: cada MFE tinha o seu próprio cliente GraphQL, e cada cliente sabia renovar o token quando ele vencia. O sistema, junto, perdia sessões.

Havia um segundo efeito, menos visível. Abrir o shell com N microfrontends podia significar até N chamadas de refresh ao mesmo tempo, mesmo quando nenhuma delas falhava.

Reproduzi o problema num laboratório e comparei duas soluções que o resolvem: um patch em `window.fetch` no orquestrador e um módulo compartilhado importado por cada MFE. As duas funcionam. A diferença está no custo de cada uma e no que cada uma esconde.

## Por que cada MFE acaba renovando sozinho

Times independentes costumam criar o próprio cliente HTTP: um `ApolloClient`, uma instância do Axios com interceptor de resposta, um wrapper de `fetch`. Eu usei o Apollo, mas a lógica é a mesma nos três. Quando o access token vence (ou a resposta é 401), o cliente chama o refresh e repete a request. Para um MFE isolado, está certo:

```ts
async function refresh() {
  const session = read()
  const res = await fetch(bffUrl, {
    method: "POST",
    body: JSON.stringify({
      query: "mutation refreshToken($token: String!) { refreshToken(token: $token) { access_token refresh_token } }",
      variables: { token: session?.refreshToken },
    }),
  })
  const tokens = (await res.json())?.data?.refreshToken
  if (!tokens) {
    clearSession()
    onExpired()
    throw new Error("refresh failed")
  }
  write(tokens)
}

const authLink = setContext(async (_, { headers }) => {
  let session = read()
  if (session && expired(session.token)) {
    await (refreshing ??= refresh().finally(() => (refreshing = undefined)))
    session = read()
  }
  return { headers: { ...headers, authorization: `Bearer ${session.token}` } }
})
```

A variável `refreshing` impede dois refreshes dentro do mesmo MFE e não enxerga o MFE ao lado. Um interceptor de resposta do Axios com fila de refresh tem o mesmo limite, porque a fila também vive dentro de uma instância. Não medi o Axios no lab; o raciocínio é o mesmo.

O problema fica ainda mais visível quando o servidor rotaciona o refresh token, e cada refresh token vale uma vez. Se o catálogo e o carrinho precisam do token ao mesmo tempo, os dois enviam o mesmo refresh token. O primeiro vale. O segundo recebe 401, e o tratamento acima apaga a sessão.

Se o servidor não rotaciona, a falha some e o problema fica. Cada MFE continua chamando o refresh por conta própria: ao abrir o shell, são até N chamadas simultâneas ao mesmo endpoint, uma por microfrontend, todas para obter o mesmo resultado. Ninguém é deslogado, mas o servidor de autenticação recebe N vezes o tráfego necessário e emite N pares de tokens. Quem olha só o erro vê o problema desaparecer. Quem conta as chamadas vê que ele continua.

Procurei se esse cenário é comum porque ele podia ter sido pontual, um erro nosso, ou um problema que já tivesse solução conhecida e bem divulgada. Eu passei por ele, e uma experiência só não diz nada sobre frequência. Não achei dado de prevalência da arquitetura em si. Achei documentação farta da corrida: o [WorkOS](https://workos.com/blog/oauth-refresh-token-race-condition) e o [OpenReplay](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/) descrevem refreshes concorrentes que se invalidam, e um [relato no Vikunja](https://community.vikunja.io/t/intermittent-redirect-to-login-screen-on-launch-concurrent-refresh-token-race-v2-3-0/4552) mostra o sintoma que vi: redirecionamento intermitente para o login. A arquitetura que cria a corrida é plausível em qualquer organização com times independentes. Quanto ela é frequente, não sei.

## O laboratório

O lab tem um shell single-spa de verdade, dois MFEs (catálogo e carrinho), cada um com o seu `ApolloClient`, e uma API em Node com GraphQL e JWT. O servidor rotaciona o refresh token, e o refresh leva 150 ms. O domínio é uma loja fictícia.

O painel de inspeção fica flutuando na tela e mostra a sessão, os refreshes e as falhas sem que eu precise abri-lo, nem abrir o devtools. Para reproduzir o problema, não precisei de um botão para simular nada à força. Bastou fazer o que um usuário faz numa aplicação: abrir um produto, esperar o token vencer e clicar em “Voltar”. O token do lab dura 5 segundos, e o painel tem um atalho, “Vencer token”, para quem não quiser esperar. A página de detalhe não tem carrinho lateral. Ao voltar, o catálogo recarrega a lista e o carrinho monta de novo, e os dois consultam a API no mesmo instante. É nesse instante que o problema acontece.

Três estratégias disputam esse momento:

- cada MFE renova o próprio token (o baseline);
- um patch em `window.fetch`, instalado no shell antes dos MFEs, renova uma vez e repete as requests que esperavam;
- um módulo `authFetch` publicado pelo import map, que cada MFE passa ao seu `HttpLink`.

No baseline, o clique em “Voltar” gera dois refreshes, um deles falha e a sessão some. Repeti o cenário 15 vezes no navegador, com os dois MFEs consultando juntos: dois refreshes no servidor e sessão perdida em 15 de 15. Com qualquer das duas soluções, um refresh e as duas consultas ok em 15 de 15.

![Sequência do baseline: catálogo e carrinho enviam o mesmo refresh token; o segundo recebe 401 e o carrinho apaga a sessão.](./assets/fig-colisao-baseline.svg "Figura 1. O baseline: dois MFEs enviam o mesmo refresh token, o segundo recebe 401 e apaga a sessão.")

![Sequência com uma das soluções: a camada de auth faz um refresh, repete as duas requests e devolve as respostas.](./assets/fig-refresh-unico.svg "Figura 2. Com o patch ou com o módulo: um refresh, e as duas requests são repetidas com o token novo.")

## Em escala

Dois MFEs são o caso mais brando. Para ver o que acontece com mais, escrevi um simulador que roda o código real dos clients e dos pacotes de auth para milhares de usuários, cada um com o seu `localStorage` e a sua `window`. Não há navegador, React nem single-spa nessa parte: o que escala é a lógica de auth.

Cada usuário chega com o token vencido, e M MFEs consultam a API em instantes sorteados dentro de uma janela de colisão de 200 ms, o intervalo em que as requests dos MFEs chegam. Foram 1.000 usuários por célula, e a tabela mostra o baseline:

| MFEs | Refreshes por usuário | Usuários deslogados | Refreshes que falham |
| ---: | ---: | ---: | ---: |
| 2 | 1,94 | 94,4% | 48,6% |
| 5 | 4,53 | 99,5% | 77,9% |
| 10 | 8,63 | 100% | 88,4% |
| 20 | 16,53 | 100% | 94% |

Com qualquer das duas soluções, a coluna de refreshes por usuário vale 1 em todas as linhas, e ninguém é deslogado.

A taxa de falha do baseline segue uma conta simples. Com rotação, só um refresh por usuário vale. Se M MFEs colidem, M menos 1 chamadas falham: 50% com dois, 95% com vinte. Quanto mais microfrontends, mais o baseline se aproxima de falhar em todo refresh. Por isso o problema pode ficar invisível num protótipo de dois MFEs e dominar o painel numa aplicação grande.

Com a rotação desligada, a falha desaparece e a multiplicação não. Nesse cenário, com os MFEs chegando em até 50 ms, o baseline fez 2, 5, 10 e 20 refreshes por usuário com 2, 5, 10 e 20 MFEs, e ninguém foi deslogado. As duas soluções fizeram um refresh em todos os casos.

Quando o endpoint de refresh também falha de vez em quando, as duas soluções deslogam uma fração parecida com a taxa de falha do endpoint: de 3,6% a 5% com 5% de falhas, de 18,5% a 21,6% com 20%. O baseline fica entre 84% e 100%, porque a colisão domina.

### O servidor pode absorver parte da colisão

A corrida só existe porque o servidor aceita cada refresh token uma vez, e uma saída é mudar isso no servidor. O [Auth0](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation) chama de período de sobreposição da rotação (*leeway*). Ele vem desativado por padrão. Durante a tolerância, a detecção de reuso é suspensa e um novo refresh token é emitido, e a documentação diz que o recurso existe para evitar problemas de concorrência quando o token rotativo é trocado várias vezes num intervalo curto. Só o token imediatamente anterior pode ser reutilizado.

Acrescentei algo parecido à API do lab, numa versão mais simples: o reuso é aceito até N segundos depois do primeiro uso. Repeti o cenário de escala com a janela de colisão em 200 ms:

| Tolerância | MFEs | Baseline: usuários deslogados | Baseline: refreshes por usuário |
| ---: | ---: | ---: | ---: |
| 0,1 s | 2 | 19,6% | 1,94 |
| 0,1 s | 10 | 94,3% | 8,58 |
| 0,5 s | 2 | 2,5% | 1,9 |
| 0,5 s | 10 | 1,1% | 8,52 |
| 5 s | 2 | 0% | 1,96 |
| 5 s | 10 | 0% | 8,54 |

Quando a tolerância é maior que a janela de colisão, de 0,5 s em diante, os logouts praticamente desaparecem sem mudar uma linha de cliente. Uma tolerância menor teve efeito parcial e dependente da concorrência: com dois MFEs, 0,1 s reduziu os logouts de 94,4% para 19,6%; com dez, ainda deixou 94,3% dos usuários deslogados. O que a tolerância não muda é o número de chamadas: o baseline continua fazendo quase um refresh por MFE, e cada um emite um novo par de tokens que o último a gravar sobrescreve no storage. A falha pode sumir, o desperdício fica. As duas soluções seguem com um refresh por usuário.

É uma alternativa legítima, e a decisão depende de quem controla o provedor de identidade. Num serviço gerenciado, o time de frontend talvez só consiga pedir a configuração. Ela também tem um preço de segurança: dentro da tolerância, o reuso não é tratado como sinal de roubo do token.

### Quando o refresh é lento

A latência do refresh define o tamanho da janela de colisão. Mantive a chegada das requests em 200 ms e variei a latência do refresh no servidor, sem tolerância:

| Latência do refresh | Baseline com 2 MFEs: deslogados | Baseline com 10 MFEs: deslogados |
| ---: | ---: | ---: |
| 50 ms | 49,3% | 95,5% |
| 150 ms | 94,7% | 100% |
| 500 ms | 98,8% | 100% |
| 1.000 ms | 100% | 100% |

Quanto mais lento o endpoint, maior a chance de uma segunda chamada sair antes de a primeira voltar. No modelo do lab, um refresh de meio segundo já coloca o baseline perto de 100%. As duas soluções fazem um refresh e deslogam 0% em todas as latências.

## Duas soluções que funcionam

A diferença entre elas, e entre elas e o baseline, é onde a lógica de refresh mora:

![Três colunas: no baseline cada MFE tem a própria lógica e a API recebe três refreshes; no patch o shell envolve window.fetch; no módulo cada MFE importa o authFetch. Nas duas soluções a API recebe um refresh.](./assets/fig-onde-a-logica-mora.svg "Figura 3. Onde a lógica de refresh mora em cada estratégia. Tracejado: o MFE não sabe que a camada existe.")

O patch instala uma função no lugar de `window.fetch`. Ela decide se a request é para a API, renova o token uma vez quando ele vence, repete as requests que esperavam e, se receber 401, renova e tenta de novo:

```ts
window.fetch = createAuthFetch({
  bffUrl,
  baseFetch: window.fetch.bind(window),
  onExpired,
})
```

Os MFEs ficam sem lógica de auth. O client de cada um passa a ter uma linha:

```ts
new ApolloClient({ link: new HttpLink({ uri }), cache: new InMemoryCache() })
```

O módulo compartilhado usa o mesmo código, mas cada MFE o recebe de forma explícita:

```ts
new HttpLink({ uri, fetch: authFetch })
```

`authFetch` vem do import map, então os MFEs importam a mesma instância. Ninguém altera `window.fetch`.

Medi o custo nos arquivos de client dos dois MFEs. Do baseline para o patch, foram 4 linhas adicionadas e 86 removidas. Para o módulo, 6 adicionadas e 86 removidas. O custo no código do MFE é o mesmo. O número não mede o resto: o patch exige uma mudança no orquestrador e nenhuma em cada MFE, enquanto o módulo exige, por MFE, a troca da linha, o `external` no build, a entrada no import map, um PR e um deploy. Multiplicado por vinte MFEs, isso é trabalho de coordenação, não de código.

O patch tem ainda um limite de alcance: ele só enxerga requests que passam por `window.fetch`. O Axios, no navegador, usa `XMLHttpRequest` por padrão. Segundo a [documentação oficial dos adapters](https://github.com/axios/axios/blob/v1.x/README.md#fetch-adapter), a ordem padrão é xhr, http e fetch, então um patch em `fetch` não intercepta o Axios, a menos que o projeto escolha o adapter de fetch. Interceptar `XMLHttpRequest` também é possível, e é uma intervenção bem mais invasiva. Se os microfrontends usam clientes diferentes, o patch cobre só os baseados em `fetch`. Não testei o Axios no lab; esse ponto vem da documentação.

Do lado de quem opera, as diferenças são estas:

| | Patch no shell | Módulo compartilhado |
| --- | --- | --- |
| Onde a lógica mora | orquestrador | módulo no import map |
| O que muda em cada MFE | nada | uma linha, build e deploy |
| Quem enxerga a dependência | só quem lê o root-config | qualquer MFE que importa |
| Ordem de carga | precisa estar instalado antes dos MFEs | explícita, resolvida pelo import map |
| Efeito em outras requests | passam pela função, mesmo as que não são de auth | só as dos MFEs que optaram |
| Clientes cobertos | só os que usam `fetch` | o cliente que cada MFE escolher ligar ao módulo |
| Teste de um MFE isolado | sem o shell, não há refresh | o módulo vem junto |

## O que o patch esconde

Um patch em `window.fetch` tem uma qualidade enganosa: o código costuma parecer correto. O caminho feliz passa em revisão e em teste, e quem usa a loja não percebe nada. Os problemas ficam nos caminhos que ninguém exercita com frequência. Vi vários numa versão anterior de um interceptor como esse e os reconstruí, para ilustrar, como código genérico. Não medi nenhum deles no lab: o `patch` que comparo acima já os corrige.

O primeiro é o `AbortSignal`. Para isolar as requests de uma sessão que expirou, o interceptor criava um `AbortController` global e injetava seu `signal` em todo `fetch`:

```ts
const withAbortSignal = (init = {}) => ({ ...init, signal: globalAbortController.signal })
```

O efeito colateral é que o `signal` de quem chamou desaparece. O Apollo cancela queries pelo `signal`, e uma biblioteca que usa `AbortSignal.timeout` perde o timeout. Nada quebra, e a tela continua funcionando. O cancelamento deixou de existir, e isso é difícil de perceber.

O segundo aparece quando o refresh falha. Limpar a fila e o storage parece suficiente, e é fácil esquecer de rejeitar as promises que esperavam e de devolver algo no `catch`:

```ts
} catch {
  queue = []
  clearStorage()
  // sem return: o fetch resolve com undefined
}
```

Quem esperava na fila fica pendurado para sempre, o que o usuário vê como carregamento infinito. Quem disparou o refresh recebe `undefined`, e o Apollo falha com um erro sobre `headers` que não aponta para o interceptor. Os testes de refresh bem-sucedido continuam passando.

Há mais, e nenhum é espetacular: um filtro que casa qualquer URL com `/graphql`, de qualquer origem, um parâmetro de redirecionamento sem codificação e o estado de uma aba que não conversa com a outra. Como as peças estão em lugares diferentes, ninguém lê tudo de uma vez.

Há também um risco de tempo, e ele é o mais comum. Soluções assim nascem como paliativo, com a promessa de uma versão definitiva depois. Acredite, isso acontece: a versão definitiva é adiada, as prioridades mudam, e o paliativo vira a solução. Um dia uma nova regra de negócio precisa entrar no mesmo arquivo, porque ali já existia o ponto de interceptação necessário. Quem mexe agora pode nem ser do time que o escreveu. A solução que parecia provisória virou definitiva, precisa evoluir e não tem dono. Isso vale para o patch e também para o módulo compartilhado: uma solução definitiva sem dono vira o próximo órfão, só que mais bem escrita.

### Por que não carregar o interceptor como um MFE

Quando passei por este desafio em produção, a primeira tentativa foi um MFE só com a lógica do interceptor. Funcionava às vezes. O single-spa monta as aplicações assim que consegue, sem uma ordem garantida, e se o MFE do interceptor carrega depois de outro, as primeiras requests saem sem proteção, pois o `window.fetch` ainda não havia sido interceptado.

Numa [issue sobre ordem de registro](https://github.com/single-spa/single-spa/issues/587), um membro do projeto respondeu: “Single-spa applications should not rely on the order of their registration.” A explicação foi que montar o mais cedo possível evita cascatas de carregamento. A recomendação foi mover o que precisa existir antes dos apps para o root config ou para um módulo utilitário. A mesma resposta descreve como forçar a ordem, registrando o segundo app no evento `single-spa:first-mount`, ao custo de desempenho. Em [outra issue](https://github.com/single-spa/single-spa/issues/966), um contribuidor lembra que o SystemJS também não garante a ordem de carga e que depender dela costuma ser um sinal de problema.

As duas soluções deste post seguem esse raciocínio: o patch no root config e o módulo utilitário.

Duas verificações no lab. Primeiro, o Apollo lê o `fetch` global a cada request, tanto na versão 3.14 quanto na 4.3, então um patch instalado depois de criar o client ainda vale. A falha está nas requests que saem antes da instalação. Segundo, com o patch carregado como um MFE e atrasos de carga sorteados, as duas requests da montagem funcionaram em 6 de 20 tentativas. Com o patch instalado no shell, 20 de 20. Os atrasos são parâmetros meus e mudam a porcentagem. O mecanismo não muda.

A [FAQ do single-spa](https://single-spa.js.org/docs/faq/) sugere um módulo utilitário de autenticação, e a palavra engana. Um utilitário, segundo a [página de tipos de módulo](https://single-spa.js.org/docs/module-types/), é um módulo comum que os outros importam, sem lifecycle próprio. Não é uma aplicação registrada no single-spa. Por isso a ordem não depende do roteador: quem precisa do `authFetch` o importa, e o grafo de imports garante que ele existe antes de ser usado.

## Várias abas e o módulo duplicado

Com duas abas abertas, os refreshes de cada aba também colidem. No lab, com duas abas e token vencido, o baseline fez 4 refreshes e perdeu a sessão em 10 de 10 tentativas. As duas soluções fizeram 1 refresh e ficaram ok em 10 de 10.

No Chromium do lab, servido em `localhost`, a proteção entre abas vem do `navigator.locks`: uma renovação por vez na origem, e quem espera relê o storage dentro do lock, porque outra aba pode ter renovado nesse intervalo. Isso desfez uma conclusão que eu esperava tirar do módulo compartilhado. Fiz um MFE empacotar uma cópia própria do `authFetch`, em vez de usar a do import map, e imaginei que voltaria a haver um refresh por cópia. Não houve: com o lock, a cópia duplicada continuou com 1 refresh em 15 de 15. Sem o lock, a cópia duplicada fez 2 refreshes e perdeu a sessão em 15 de 15, e a instância única do import map continuou ok. A proteção do módulo duplicado vem do lock, e a do import map vem de existir uma instância só. Essa garantia entre abas depende de Web Locks disponível em contexto seguro. Sem a API, o fallback conserva o single-flight dentro de cada instância, mas não coordena abas.

## Quando usar cada uma

O patch cabe quando o time que resolve o problema não controla os MFEs. É a mudança mais curta e nenhum MFE precisa ser alterado. O custo é um contrato implícito: quem lê o código de um MFE não vê que `fetch` foi trocado, e alguém precisa ser dono do orquestrador e do patch. Antes de escolher, vale conferir se todos os MFEs usam `fetch`.

O módulo compartilhado cabe quando os MFEs podem ser migrados. Cada um passa a declarar a dependência. Em troca, a migração custa um PR, uma configuração de build e um deploy por MFE, e todos os consumidores compartilham as versões do módulo.

As duas resolvem a colisão. Escolher entre elas é decidir onde pagar: uma vez, num ponto escondido, ou muitas vezes, de forma explícita.

## Limitações

- O simulador de escala roda a lógica real dos clients e dos pacotes de auth, mas sem navegador, React nem single-spa. Ele não modela várias abas. Esse caso está no benchmark do navegador, com poucas tentativas.
- O resultado entre abas depende de `navigator.locks`, disponível em contexto seguro e limitado à mesma origem. Sem essa API, o fallback do lab não impede refreshes concorrentes entre abas.
- Rotação estrita, latência de refresh fixa de 150 ms e “qualquer falha de refresh derruba a sessão” são decisões minhas. Elas definem uma parte dos percentuais de logout do baseline. A forma da curva, com a falha crescendo junto com o número de MFEs, é o resultado robusto. Os valores absolutos, não.
- A tolerância de rotação do lab é mais simples que a do Auth0: aceita qualquer reuso até N segundos depois do primeiro uso, enquanto o Auth0 só aceita o token imediatamente anterior.
- Quase todos os cenários do navegador são determinísticos por construção, então repetir 15 vezes não gera 15 amostras independentes. A exceção é a ordem de carga, que depende de atrasos sorteados.
- O cenário de 401 com token válido compara coisas diferentes: o baseline não trata 401, e o `authFetch` foi escrito para tratar. O ganho vem dessa funcionalidade, e não da localização.
- Só testei o Apollo. O raciocínio vale para outros clientes HTTP, como o Axios com interceptors, mas não os medi.
- Os riscos do interceptor global acima vêm de uma auditoria de código. Não têm número aqui.
- Os números do laboratório são sintéticos e vêm de uma máquina, um Chromium e o Apollo Client 3.14.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/005-fetch-interceptor-tradeoffs/lab
npm install
npm run up
```

Abra `http://localhost:4180/?variant=baseline`, escolha uma estratégia no painel (`baseline`, `patch` ou `utility`, na URL), abra um produto, use “Vencer token” e clique em “Voltar”. Para repetir as medições:

```bash
npm run benchmark   # navegador, com Playwright
npm run scale       # usuários simulados no Node
```

## Referências

- single-spa: [FAQ](https://single-spa.js.org/docs/faq/), [tipos de módulo](https://single-spa.js.org/docs/module-types/) e as issues [#587](https://github.com/single-spa/single-spa/issues/587) (ordem de registro) e [#966](https://github.com/single-spa/single-spa/issues/966) (ordem de carga)
- Auth0: [Configure refresh token rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation)
- WorkOS: [OAuth refresh token race condition](https://workos.com/blog/oauth-refresh-token-race-condition)
- OpenReplay: [Fix token refresh race with the Web Locks API](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/)
- Axios: [fetch adapter](https://github.com/axios/axios/blob/v1.x/README.md#fetch-adapter)
- Apollo Client: [HttpLink](https://www.apollographql.com/docs/react/api/link/apollo-link-http)
- MDN: [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
