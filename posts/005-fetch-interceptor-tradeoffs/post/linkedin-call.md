---
post: "005"
channel: linkedin
lang: pt-br
status: review
link: https://lab.synko.digital/pt-br/005-fetch-interceptor-tradeoffs/?utm_source=linkedin&utm_medium=social&utm_campaign=005-fetch-interceptor-tradeoffs
---

# Chamada no LinkedIn · 005

## Copy do post

```text
Usuários caíam no login sem motivo aparente, e o painel mostrava a mutation de refresh de token falhando numa taxa alta e constante.

Vivi isso numa aplicação com vários microfrontends, cada um com o seu cliente GraphQL, cada um sabendo renovar o token quando ele vence. Nenhuma peça estava errada.

Com rotação de refresh token, só o primeiro refresh vale. Se o catálogo e o carrinho precisam do token ao mesmo tempo, o segundo recebe 401 e apaga a sessão. Se o servidor não rotaciona, ninguém é deslogado, mas abrir o shell vira até N chamadas de refresh iguais.

Reproduzi num lab com single-spa de verdade. Com 20 MFEs colidindo, o baseline fez em média 16,5 refreshes por usuário, 94% deles falharam e 100% dos usuários perderam a sessão. Com um patch em window.fetch no shell, ou com um módulo importado por cada MFE, foi 1 refresh e nenhuma sessão perdida.

As duas resolvem. O que muda é onde se paga: uma vez, num ponto que o MFE não enxerga, ou em cada MFE, de forma explícita. O patch esconde coisas que passam em revisão: o AbortSignal de quem chamou some, e a promise fica pendurada se o refresh falha. Ele também não alcança clientes que usam XMLHttpRequest, como o Axios por padrão. No servidor, uma tolerância de rotação larga o bastante pode eliminar os logouts, mas não as N chamadas.

Ressalva: o simulador roda a lógica de auth sem navegador, com rotação estrita e refresh de 150 ms. Os números descrevem o formato da curva. A taxa real de qualquer sistema depende de latência, rotação e política de falha, que aqui são fixas.

Queria ouvir se alguém já passou por isso. Vocês tinham N clientes renovando o mesmo token? Como descobriram?

Resolveram no shell, num módulo compartilhado, no servidor ou de outro jeito? E o que fariam diferente hoje?

Artigo, lab reproduzível e dados brutos no primeiro comentário.

#microfrontends #singlespa #frontend #autenticacao #arquiteturadesoftware
```

## Primeiro comentário

```text
Artigo completo, com os diagramas, os números e as limitações:
https://lab.synko.digital/pt-br/005-fetch-interceptor-tradeoffs/?utm_source=linkedin&utm_medium=social&utm_campaign=005-fetch-interceptor-tradeoffs

English version:
https://lab.synko.digital/en/005-fetch-interceptor-tradeoffs/?utm_source=linkedin&utm_medium=social&utm_campaign=005-fetch-interceptor-tradeoffs

Lab reproduzível e dados brutos:
https://github.com/jeandiego/evidence-lab/tree/main/posts/005-fetch-interceptor-tradeoffs
```

## Segundo comentário (para abrir a conversa)

```text
Para quem controla 20 MFEs de times diferentes: patch no shell ou módulo compartilhado? E para quem resolveu no servidor com tolerância de rotação, que janela vocês usaram?
```

## Checklist antes de publicar

- [ ] Anexar o vídeo `post/assets/reel-005.mp4` (1080×1350, 15 s) ao post.
- [ ] Artigo em português e em inglês acessíveis nas URLs acima.
- [ ] Commit com `lab/`, `evidence/`, `design/` e `post/` enviado para `main` no GitHub.
- [ ] Números conferidos em `evidence/scale-benchmark.json`: 16,53 refreshes por usuário, 94% de refreshes com falha e 100% de usuários deslogados com 20 MFEs e janela de 200 ms.
- [ ] Texto sem nome da empresa nem contagem de microfrontends ("vários"); o 20 do texto é a simulação.
- [ ] Primeiro comentário publicado logo após o post; segundo comentário 10 a 15 minutos depois.
- [ ] Responder os primeiros comentários na primeira hora.
