# Cada microfrontend renova o próprio token: onde essa lógica deveria morar?

Numa aplicação com mais de vinte microfrontends, usuários eram deslogados sem motivo aparente. O painel de observabilidade mostrava uma mutation de refresh de token com uma taxa de erro alta e constante. Cada MFE tinha o seu próprio cliente GraphQL, e cada cliente sabia renovar o token quando ele vencia.

Cada peça fazia o que devia. O sistema, junto, perdia sessões.

Escrevi este post para mostrar por quê, reproduzir o problema num laboratório e comparar duas formas de resolvê-lo: um patch em `window.fetch` no orquestrador e um módulo compartilhado importado por cada MFE. As duas funcionam. A diferença está no custo de cada uma e no que cada uma esconde.

## Por que cada MFE acaba renovando sozinho

Times independentes costumam criar o próprio `ApolloClient`. Quando o access token vence, cada cliente chama a mutation de refresh antes de repetir a request. Para um MFE isolado, está certo:

```ts
const authLink = setContext(async (_, { headers }) => {
  let session = read()
  if (session && expired(session.token)) {
    await (refreshing ??= refresh().finally(() => (refreshing = undefined)))
    session = read()
  }
  return { headers: { ...headers, authorization: `Bearer ${session.token}` } }
})
```

A variável `refreshing` impede dois refreshes dentro do mesmo MFE. Ela não enxerga o MFE ao lado.

O problema aparece quando o servidor rotaciona o refresh token: cada refresh token vale uma vez. Se o catálogo e o carrinho precisam do token ao mesmo tempo, os dois enviam o mesmo refresh token. O primeiro vale. O segundo recebe 401, e o código acima responde apagando a sessão.

Procurei se esse cenário é comum. Não achei dado de prevalência da arquitetura em si. Achei documentação farta da corrida: o [WorkOS](https://workos.com/blog/oauth-refresh-token-race-condition) e o [OpenReplay](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/) descrevem refreshes concorrentes que se invalidam, e um [relato no Vikunja](https://community.vikunja.io/t/intermittent-redirect-to-login-screen-on-launch-concurrent-refresh-token-race-v2-3-0/4552) mostra o mesmo sintoma que vi: redirecionamento intermitente para o login. A arquitetura que cria a corrida é plausível em qualquer organização com times independentes. Quanto ela é frequente, não sei.

## O laboratório

O lab tem um shell single-spa de verdade, dois MFEs (catálogo e carrinho), cada um com o seu `ApolloClient`, e uma API em Node com GraphQL e JWT. O servidor rotaciona o refresh token e a latência do refresh é de 150 ms. O domínio é uma loja fictícia.

O inspector da loja mostra a sessão, os refreshes e as falhas sem abrir. Para reproduzir o problema, não precisei de um botão de laboratório. Bastou o que um usuário faz: abrir um produto, esperar o token vencer e clicar em "Voltar". A página de detalhe não tem carrinho lateral. Ao voltar, o catálogo recarrega a lista e o carrinho monta de novo, e os dois consultam a API no mesmo instante.

Três estratégias disputam esse momento:

- cada MFE renova o próprio token (o baseline);
- um patch em `window.fetch`, instalado no shell antes dos MFEs, renova uma vez e repete as requests que esperavam;
- um módulo `authFetch` publicado pelo import map, que cada MFE passa ao seu `HttpLink`.

No baseline, o clique em "Voltar" gera dois refreshes, um deles falha e a sessão some. Repeti o cenário 15 vezes no navegador, com os dois MFEs consultando juntos: dois refreshes no servidor e sessão perdida em 15 de 15. Com o patch e com o módulo compartilhado, um refresh e as duas consultas ok em 15 de 15.

## Em escala

Dois MFEs são o caso mais brando. Para ver o que acontece com mais, escrevi um simulador que roda o código real dos clients e dos pacotes de auth para milhares de usuários, cada um com o seu `localStorage` e a sua `window`. Não há navegador, React nem single-spa nessa parte: o que escala é a lógica de auth.

Cada usuário chega com o token vencido, e M MFEs consultam a API em instantes sorteados numa janela de 200 ms. Foram 1.000 usuários por célula:

| MFEs | Refreshes por usuário (baseline) | Usuários deslogados (baseline) | Refreshes que falham no servidor (baseline) |
| ---: | ---: | ---: | ---: |
| 2 | 1,94 | 94,4% | 48,6% |
| 5 | 4,53 | 99,5% | 77,9% |
| 10 | 8,63 | 100% | 88,4% |
| 20 | 16,53 | 100% | 94% |

Com o patch ou o módulo compartilhado, a coluna de refreshes por usuário vale 1 em todas as linhas, e ninguém é deslogado.

A taxa de falha do baseline segue uma conta simples. Com rotação, só um refresh por usuário vale. Se M MFEs colidem, M menos 1 chamadas falham: 50% com dois, 95% com vinte. Quanto mais microfrontends, mais o baseline se aproxima de falhar em todo refresh. Esse é o motivo pelo qual o problema pode ficar invisível num protótipo de dois MFEs e dominar o painel numa aplicação grande.

Quando o endpoint de refresh também falha de vez em quando, o patch e o módulo compartilhado deslogam uma fração parecida com a taxa de falha do endpoint: de 3,6% a 5% com 5% de falhas, de 18,5% a 21,6% com 20%. O baseline fica entre 84% e 100%, porque a colisão domina.

## O servidor pode absorver parte da colisão

A corrida só existe porque o servidor aceita cada refresh token uma vez. Uma saída é mudar isso no servidor. O [Auth0](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation) chama de período de sobreposição da rotação (*leeway*). Ele vem desativado por padrão. Durante a janela, a detecção de reuso é suspensa e um novo refresh token é emitido, e a documentação diz que o recurso existe para evitar problemas de concorrência quando o token rotativo é trocado várias vezes num intervalo curto. Só o token imediatamente anterior pode ser reutilizado.

Acrescentei algo parecido à API do lab, numa versão mais simples: o reuso é aceito até N segundos depois do primeiro uso. Repeti o cenário de escala, com a janela de colisão em 200 ms:

| Tolerância | MFEs | Baseline: usuários deslogados | Baseline: refreshes por usuário |
| ---: | ---: | ---: | ---: |
| 0,1 s | 2 | 19,6% | 1,94 |
| 0,1 s | 10 | 94,3% | 8,58 |
| 0,5 s | 2 | 2,5% | 1,9 |
| 0,5 s | 10 | 1,1% | 8,52 |
| 5 s | 2 | 0% | 1,96 |
| 5 s | 10 | 0% | 8,54 |

Com uma janela maior que a rajada, de 0,5 s em diante, os logouts praticamente desaparecem sem mudar uma linha de cliente. Uma janela mais curta que a rajada deixa quase tudo como estava. O que a tolerância não muda é o número de chamadas: o baseline continua fazendo quase um refresh por MFE, e cada um emite um novo par de tokens que o último a gravar sobrescreve no storage. A falha some, o desperdício fica. O patch e o módulo compartilhado seguem com um refresh por usuário.

A tolerância é uma alternativa legítima, e a decisão depende de quem controla o provedor de identidade. Num serviço gerenciado, o time de frontend talvez só consiga pedir a configuração. E ela tem um preço de segurança: dentro da janela, o reuso não é tratado como sinal de roubo do token.

## Quando o refresh é lento

A latência do refresh define o tamanho da janela de colisão. Mantive a chegada das requests em 200 ms e variei a latência do refresh no servidor, sem tolerância:

| Latência do refresh | Baseline com 2 MFEs: deslogados | Baseline com 10 MFEs: deslogados |
| ---: | ---: | ---: |
| 50 ms | 49,3% | 95,5% |
| 150 ms | 94,7% | 100% |
| 500 ms | 98,8% | 100% |
| 1.000 ms | 100% | 100% |

Quanto mais lento o endpoint, maior a chance de uma segunda chamada sair antes de a primeira voltar. No modelo do lab, um refresh de meio segundo já coloca o baseline perto de 100%. O patch e o módulo compartilhado fazem um refresh e deslogam 0% em todas as latências.

## Duas soluções que funcionam

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

Medi o custo nos arquivos de client dos dois MFEs. Do baseline para o patch, foram 4 linhas adicionadas e 86 removidas. Para o módulo, 6 adicionadas e 86 removidas. O custo no código do MFE é o mesmo. O que o número não mede é o resto: o patch exige uma mudança no orquestrador e nenhuma em cada MFE, enquanto o módulo exige, por MFE, a troca da linha, o `external` no build, a entrada no import map, um PR e um deploy. Multiplicado por vinte MFEs, isso é trabalho de coordenação, não de código.

Do lado de quem opera, as diferenças são estas:

| | Patch no shell | Módulo compartilhado |
| --- | --- | --- |
| Onde a lógica mora | orquestrador | módulo no import map |
| O que muda em cada MFE | nada | uma linha, build e deploy |
| Quem enxerga a dependência | só quem lê o root-config | qualquer MFE que importa |
| Ordem de carga | precisa estar instalado antes dos MFEs | explícita, resolvida pelo import map |
| Efeito em outras requests | passam pela função, mesmo as que não são de auth | só as dos MFEs que optaram |
| Teste de um MFE isolado | sem o shell, não há refresh | o módulo vem junto |

## O que o patch esconde

Um patch em `window.fetch` tem uma qualidade enganosa: o código costuma parecer correto. O caminho feliz passa em revisão e em teste, e quem usa a loja não percebe nada. Os problemas ficam nos caminhos que ninguém exercita com frequência. Vi vários numa versão anterior de um interceptor como esse e os reconstruí, para ilustrar, como código genérico. Não medi nenhum deles no lab: o `patch` que comparo acima já os corrige.

O primeiro é o `AbortSignal`. Para isolar as requests de uma sessão que expirou, o interceptor criava um `AbortController` global e injetava seu `signal` em todo `fetch`:

```ts
const withAbortSignal = (init = {}) => ({ ...init, signal: globalAbortController.signal })
```

O efeito colateral é que o `signal` de quem chamou desaparece. O Apollo cancela queries pelo `signal`, e uma biblioteca que usa `AbortSignal.timeout` perde o timeout. Nada quebra, e a tela continua funcionando. Só que o cancelamento deixou de existir, e isso é difícil de perceber.

O segundo aparece quando o refresh falha. A fila de requests que esperavam era descartada, sem rejeitar as promises:

```ts
} catch {
  queue = []
  clearStorage()
  // sem return: o fetch resolve com undefined
}
```

Quem esperava na fila fica pendurado para sempre, o que o usuário vê como carregamento infinito. Quem disparou o refresh recebe `undefined`, e o Apollo falha com um erro sobre `headers` que não aponta para o interceptor. Os testes de refresh bem-sucedido continuam passando.

Há mais, e nenhum é espetacular: um filtro que casa qualquer URL com `/graphql`, de qualquer origem, um parâmetro de redirecionamento sem codificação e o estado de uma aba que não conversa com a outra. Como as peças estão em lugares diferentes, ninguém lê tudo de uma vez.

Um risco de outra ordem é o do tempo. O interceptor nasceu como solução provisória, a ser trocada por algo definitivo. A solução definitiva nunca foi feita: o time dono foi desfeito. Meses depois, regra de negócio de um parceiro entrou no mesmo arquivo. Um global escondido, sem dono, cresce. Isso vale para o patch e também para o módulo compartilhado: uma solução definitiva sem dono vira o próximo órfão, só que mais bem escrita.

### Por que não carregar o interceptor como um MFE

A primeira tentativa foi um MFE só com a lógica do interceptor. Funcionava às vezes. O single-spa monta as aplicações assim que consegue, sem uma ordem garantida, e se o MFE do interceptor carrega depois de outro, as primeiras requests saem sem proteção.

Numa [issue sobre ordem de registro](https://github.com/single-spa/single-spa/issues/587), um membro do projeto respondeu: "Single-spa applications should not rely on the order of their registration." A explicação foi que montar o mais cedo possível evita cascatas de carregamento. A recomendação foi mover o que precisa existir antes dos apps para o root config ou para um módulo utilitário. A mesma resposta descreve como forçar a ordem, registrando o segundo app no evento `single-spa:first-mount`, ao custo de desempenho. Em [outra issue](https://github.com/single-spa/single-spa/issues/966), um contribuidor lembra que o SystemJS também não garante a ordem de carga e que depender dela costuma ser um sinal de problema.

As duas soluções deste post seguem esse raciocínio: o patch no root config e o módulo utilitário.

Duas verificações no lab. Primeiro, o Apollo lê o `fetch` global a cada request, tanto na versão 3.14 quanto na 4.3, então um patch instalado depois de criar o client ainda vale. A falha está nas requests que saem antes da instalação. Segundo, no lab, com o patch carregado como um MFE e atrasos de carga sorteados, as duas requests da montagem funcionaram em 6 de 20 tentativas. Com o patch instalado no shell, 20 de 20. Os atrasos são parâmetros meus e mudam a porcentagem. O mecanismo não muda.

A [FAQ do single-spa](https://single-spa.js.org/docs/faq/) sugere um módulo utilitário de autenticação, e a palavra engana. Um utilitário, segundo a [página de tipos de módulo](https://single-spa.js.org/docs/module-types/), é um módulo comum que os outros importam, sem lifecycle próprio. Não é uma aplicação registrada no single-spa. Por isso a ordem não depende do roteador: quem precisa do `authFetch` o importa, e o grafo de imports garante que ele existe antes de ser usado.

## Várias abas e o módulo duplicado

Com duas abas abertas, os refreshes de cada aba também colidem. No lab, com duas abas e token vencido, o baseline fez 4 refreshes e perdeu a sessão em 10 de 10 tentativas. O patch e o módulo compartilhado fizeram 1 refresh e ficaram ok em 10 de 10.

A proteção entre abas vem do `navigator.locks`: uma renovação por vez na origem, e quem espera relê o storage dentro do lock, porque outra aba pode ter renovado nesse intervalo. Isso muda uma conclusão que eu esperava tirar do módulo compartilhado. Fiz um MFE empacotar uma cópia própria do `authFetch`, em vez de usar a do import map. Imaginei que voltaria a haver um refresh por cópia. Não houve: com o lock, uma cópia duplicada continuou com 1 refresh em 15 de 15. Sem o lock, a cópia duplicada fez 2 refreshes e perdeu a sessão em 15 de 15, e a instância única do import map continuou ok. A proteção do módulo duplicado vem do lock, e a do import map vem de existir uma instância só.

## Quando usar cada uma

O patch cabe quando o time que resolve o problema não controla os MFEs. É a mudança mais curta e nenhum MFE precisa ser alterado. O custo é um contrato implícito: quem lê o código de um MFE não vê que `fetch` foi trocado, e alguém precisa ser dono do orquestrador e do patch.

O módulo compartilhado cabe quando os MFEs podem ser migrados. Cada um passa a declarar a dependência. Em troca, a migração custa um PR, uma configuração de build e um deploy por MFE, e todos os consumidores compartilham as versões do módulo.

As duas resolvem a colisão. Escolher entre elas é decidir onde pagar: uma vez, num ponto escondido, ou muitas vezes, de forma explícita.

## Limitações

- O simulador de escala roda a lógica real dos clients e dos pacotes de auth, mas sem navegador, React nem single-spa. Ele não modela várias abas. Esse caso está no benchmark do navegador, com poucas tentativas.
- Rotação estrita, latência de refresh fixa de 150 ms e "qualquer falha de refresh derruba a sessão" são decisões minhas. Elas definem uma parte dos percentuais de logout do baseline. A forma da curva (a falha crescendo com o número de MFEs) é o resultado robusto. Os valores absolutos, não.
- A tolerância de rotação do lab é mais simples que a do Auth0: aceita qualquer reuso até N segundos depois do primeiro uso, enquanto o Auth0 só aceita o token imediatamente anterior.
- Quase todos os cenários do navegador são determinísticos por construção, então repetir 15 vezes não gera 15 amostras independentes. A exceção é a ordem de carga, que depende de atrasos sorteados.
- O cenário de 401 com token válido compara coisas diferentes: o baseline não trata 401, e o `authFetch` foi escrito para tratar. O ganho vem dessa funcionalidade, não da localização.
- Os riscos do interceptor global acima vêm de uma auditoria de código. Não têm número aqui.
- Os números do laboratório são sintéticos e vêm de uma máquina, um Chromium e o Apollo Client 3.14.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/005-fetch-interceptor-tradeoffs/lab
npm install
npm run up
```

Abra `http://localhost:4180/?variant=baseline`, escolha uma estratégia no inspector, abra um produto, use "Vencer token" e clique em "Voltar". Para repetir as medições:

```bash
npm run benchmark   # navegador, com Playwright
npm run scale       # usuários simulados no Node
```

## Referências

- single-spa: [FAQ](https://single-spa.js.org/docs/faq/), [tipos de módulo](https://single-spa.js.org/docs/module-types/) e as issues [#587](https://github.com/single-spa/single-spa/issues/587) (ordem de registro) e [#966](https://github.com/single-spa/single-spa/issues/966) (ordem de carga)
- Auth0: [Configure refresh token rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation)
- WorkOS: [OAuth refresh token race condition](https://workos.com/blog/oauth-refresh-token-race-condition)
- OpenReplay: [Fix token refresh race with the Web Locks API](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/)
- Apollo Client: [HttpLink](https://www.apollographql.com/docs/react/api/link/apollo-link-http)
- MDN: [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
