---
title: "Each microfrontend renews its own token: where should that logic live?"
emphasis: "where should that logic live?"
description: "When several microfrontends try to renew the same token at the same time, strict rotation can drop the session and generate up to N calls where one would do. The lab compares a patch in the shell with a shared module."
number: "005"
slug: 005-fetch-interceptor-tradeoffs
lang: en
date: 2026-10-22
status: review
thesis: "When N microfrontends try to renew the same token at the same time, strict rotation can drop the session and generate up to N calls where one would do. A patch in the shell and a shared module both fix the collision; the difference is who pays and what each one hides."
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

In an application with several connected microfrontends, users were being logged out for no apparent reason. The observability dashboard showed the token refresh mutation failing at a high, steady rate. I lived through this one. No part was wrong: each MFE had its own GraphQL client, and each client knew how to renew the token when it expired. Together, the system lost sessions.

There was a second effect, less visible. Opening the shell with N microfrontends could mean up to N refresh calls at the same time, even when none of them failed.

I reproduced the problem in a lab and compared two solutions that fix it: a patch on `window.fetch` in the orchestrator and a shared module imported by each MFE. Both work. The difference is what each one costs and what each one hides.

## Why each MFE ends up renewing on its own

Independent teams tend to create their own HTTP client: an `ApolloClient`, an Axios instance with a response interceptor, a `fetch` wrapper. I used Apollo, but the logic is the same in all three. When the access token expires (or the response is a 401), the client calls refresh and retries the request. For a single MFE, that is correct:

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

The `refreshing` variable prevents two refreshes inside the same MFE and cannot see the MFE next to it. An Axios response interceptor with a refresh queue has the same limit, because the queue also lives inside one instance. I did not measure Axios in the lab; the reasoning is the same.

The problem becomes even more visible when the server rotates the refresh token, so that each refresh token works once. If the catalog and the cart need the token at the same time, both send the same refresh token. The first one works. The second gets a 401, and the handling above wipes the session.

If the server does not rotate, the failure goes away and the problem stays. Each MFE keeps calling refresh on its own: when the shell opens, that is up to N simultaneous calls to the same endpoint, one per microfrontend, all to get the same result. Nobody is logged out, but the auth server receives N times the traffic it needs and issues N token pairs. Whoever looks only at the errors sees the problem disappear. Whoever counts the calls sees it is still there.

I looked into whether this scenario is common because it could have been a one-off, a mistake of ours, or a problem that already had a well-known fix. I went through it, and a single experience says nothing about frequency. I found no prevalence data for the architecture itself. I found plenty of documentation of the race: [WorkOS](https://workos.com/blog/oauth-refresh-token-race-condition) and [OpenReplay](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/) describe concurrent refreshes that invalidate each other, and a [report on the Vikunja forum](https://community.vikunja.io/t/intermittent-redirect-to-login-screen-on-launch-concurrent-refresh-token-race-v2-3-0/4552) shows the symptom I saw: intermittent redirects to the login page. The architecture that creates the race is plausible in any organization with independent teams. How often it happens, I do not know.

## The lab

The lab has a real single-spa shell, two MFEs (catalog and cart), each with its own `ApolloClient`, and a Node API with GraphQL and JWT. The server rotates the refresh token, and the refresh takes 150 ms. The domain is a fictional store.

The inspection panel floats on screen and shows the session, the refreshes and the failures without my having to open it, or the devtools. To reproduce the problem I did not need a button to simulate anything by force. It was enough to do what a user does in an application: open a product, wait for the token to expire and click “Voltar” (Back). The lab token lasts 5 seconds, and the panel has a shortcut, “Vencer token” (expire token), for anyone who does not want to wait. The detail page has no side cart. When you go back, the catalog reloads the list and the cart mounts again, and both query the API at the same instant. That is the instant where the problem happens.

Three strategies compete for that moment:

- each MFE renews its own token (the baseline);
- a patch on `window.fetch`, installed in the shell before the MFEs, which renews once and replays the requests that were waiting;
- an `authFetch` module published through the import map, which each MFE passes to its `HttpLink`.

In the baseline, clicking “Voltar” produces two refreshes, one of them fails and the session disappears. I repeated the scenario 15 times in the browser, with both MFEs querying together: two refreshes on the server and the session lost in 15 of 15. With either solution, one refresh and both queries ok in 15 of 15.

![Baseline sequence: catalog and cart send the same refresh token; the second gets a 401 and the cart wipes the session.](./assets/fig-colisao-baseline.en.svg "Figure 1. The baseline: two MFEs send the same refresh token, the second gets a 401 and wipes the session.")

![Sequence with one of the solutions: the auth layer makes one refresh, replays both requests and returns the responses.](./assets/fig-refresh-unico.en.svg "Figure 2. With the patch or the module: one refresh, and both requests are replayed with the new token.")

## At scale

Two MFEs are the mildest case. To see what happens with more, I wrote a simulator that runs the real client code and the auth packages for thousands of users, each with their own `localStorage` and `window`. There is no browser, React or single-spa in this part: what scales is the auth logic.

Each user arrives with an expired token, and M MFEs query the API at random instants inside a collision window of 200 ms, the interval in which the MFEs' requests arrive. There were 1,000 users per cell, and the table shows the baseline:

| MFEs | Refreshes per user | Users logged out | Refreshes that fail |
| ---: | ---: | ---: | ---: |
| 2 | 1.94 | 94.4% | 48.6% |
| 5 | 4.53 | 99.5% | 77.9% |
| 10 | 8.63 | 100% | 88.4% |
| 20 | 16.53 | 100% | 94% |

With either solution, the refreshes-per-user column is 1 in every row, and nobody is logged out.

The baseline failure rate follows a simple count. With rotation, only one refresh per user works. If M MFEs collide, M minus 1 calls fail: 50% with two, 95% with twenty. The more microfrontends, the closer the baseline gets to failing every refresh. That is why the problem can stay invisible in a two-MFE prototype and dominate the dashboard in a large application.

With rotation turned off, the failure disappears and the multiplication does not. In that scenario, with the MFEs arriving within 50 ms, the baseline made 2, 5, 10 and 20 refreshes per user with 2, 5, 10 and 20 MFEs, and nobody was logged out. Both solutions made one refresh in every case.

When the refresh endpoint also fails now and then, both solutions log out a fraction close to the endpoint's failure rate: from 3.6% to 5% with 5% failures, from 18.5% to 21.6% with 20%. The baseline stays between 84% and 100%, because the collision dominates.

### The server can absorb part of the collision

The race exists only because the server accepts each refresh token once, and one way out is to change that on the server. [Auth0](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation) calls it the rotation overlap period (*leeway*). It is off by default. During the leeway, reuse detection is suspended and a new refresh token is issued, and the documentation says the feature exists to avoid concurrency problems when the rotating token is exchanged several times in a short interval. Only the immediately previous token can be reused.

I added something similar to the lab API, in a simpler form: reuse is accepted up to N seconds after the first use. I repeated the scale scenario with the collision window at 200 ms:

| Leeway | MFEs | Baseline: users logged out | Baseline: refreshes per user |
| ---: | ---: | ---: | ---: |
| 0.1 s | 2 | 19.6% | 1.94 |
| 0.1 s | 10 | 94.3% | 8.58 |
| 0.5 s | 2 | 2.5% | 1.9 |
| 0.5 s | 10 | 1.1% | 8.52 |
| 5 s | 2 | 0% | 1.96 |
| 5 s | 10 | 0% | 8.54 |

When the leeway is larger than the collision window, from 0.5 s on, logouts practically disappear without changing a line of client code. A shorter leeway had a partial effect that depended on concurrency: with two MFEs, 0.1 s reduced logouts from 94.4% to 19.6%; with ten, 94.3% of users were still logged out. What the leeway does not change is the number of calls: the baseline still makes almost one refresh per MFE, and each one issues a new token pair that the last writer overwrites in storage. The failure may go away, the waste stays. Both solutions keep making one refresh per user.

It is a legitimate alternative, and the decision depends on who controls the identity provider. On a managed service, the frontend team may only be able to ask for the setting. It also has a security price: inside the leeway, reuse is not treated as a sign of token theft.

### When the refresh is slow

The refresh latency sets the size of the collision window. I kept the requests arriving within 200 ms and varied the refresh latency on the server, with no leeway:

| Refresh latency | Baseline with 2 MFEs: logged out | Baseline with 10 MFEs: logged out |
| ---: | ---: | ---: |
| 50 ms | 49.3% | 95.5% |
| 150 ms | 94.7% | 100% |
| 500 ms | 98.8% | 100% |
| 1,000 ms | 100% | 100% |

The slower the endpoint, the higher the chance that a second call goes out before the first one returns. In the lab's model, a half-second refresh already puts the baseline close to 100%. Both solutions make one refresh and log out 0% at every latency.

## Two solutions that work

The difference between them, and between them and the baseline, is where the refresh logic lives:

![Three columns: in the baseline each MFE has its own logic and the API receives three refreshes; with the patch the shell wraps window.fetch; with the module each MFE imports authFetch. With both solutions the API receives one refresh.](./assets/fig-onde-a-logica-mora.en.svg "Figure 3. Where the refresh logic lives in each strategy. Dashed: the MFE does not know the layer exists.")

The patch installs a function in place of `window.fetch`. It decides whether the request is for the API, renews the token once when it expires, replays the requests that were waiting and, on a 401, renews and tries again:

```ts
window.fetch = createAuthFetch({
  bffUrl,
  baseFetch: window.fetch.bind(window),
  onExpired,
})
```

The MFEs end up with no auth logic. Each one's client becomes a single line:

```ts
new ApolloClient({ link: new HttpLink({ uri }), cache: new InMemoryCache() })
```

The shared module uses the same code, but each MFE receives it explicitly:

```ts
new HttpLink({ uri, fetch: authFetch })
```

`authFetch` comes from the import map, so the MFEs import the same instance. Nobody touches `window.fetch`.

I measured the cost in the client files of the two MFEs. From the baseline to the patch, 4 lines were added and 86 removed. For the module, 6 added and 86 removed. The cost in MFE code is the same. The number does not measure the rest: the patch requires one change in the orchestrator and none in each MFE, while the module requires, per MFE, the one-line swap, the `external` in the build, the import map entry, a PR and a deploy. Multiplied by twenty MFEs, that is coordination work, not code.

The patch also has a limit of reach: it only sees requests that go through `window.fetch`. In the browser, Axios uses `XMLHttpRequest` by default. According to the [official adapters documentation](https://github.com/axios/axios/blob/v1.x/README.md#fetch-adapter), the default order is xhr, http and fetch, so a patch on `fetch` does not intercept Axios unless the project picks the fetch adapter. Intercepting `XMLHttpRequest` is also possible, and it is a much more invasive intervention. If the microfrontends use different clients, the patch covers only the `fetch`-based ones. I did not test Axios in the lab; this point comes from the documentation.

From the operator's side, the differences are these:

| | Patch in the shell | Shared module |
| --- | --- | --- |
| Where the logic lives | orchestrator | module in the import map |
| What changes in each MFE | nothing | one line, build and deploy |
| Who sees the dependency | only whoever reads the root-config | any MFE that imports it |
| Load order | must be installed before the MFEs | explicit, resolved by the import map |
| Effect on other requests | all go through the function, even non-auth ones | only those from MFEs that opted in |
| Clients covered | only those that use `fetch` | whichever client each MFE chooses to wire to the module |
| Testing a single MFE | without the shell, there is no refresh | the module comes along |

## What the patch hides

A patch on `window.fetch` has a deceptive quality: the code usually looks correct. The happy path passes review and tests, and whoever uses the store notices nothing. The problems sit in the paths nobody exercises often. I saw several in an earlier version of an interceptor like this one and rebuilt them, to illustrate, as generic code. I did not measure any of them in the lab: the `patch` I compare above already fixes them.

The first is the `AbortSignal`. To isolate the requests of an expired session, the interceptor created a global `AbortController` and injected its `signal` into every `fetch`:

```ts
const withAbortSignal = (init = {}) => ({ ...init, signal: globalAbortController.signal })
```

The side effect is that the caller's `signal` disappears. Apollo cancels queries through the `signal`, and a library that uses `AbortSignal.timeout` loses its timeout. Nothing breaks, and the screen keeps working. Cancellation stopped existing, and that is hard to notice.

The second shows up when the refresh fails. Clearing the queue and the storage feels like enough, and it is easy to forget to reject the promises that were waiting and to return something in the `catch`:

```ts
} catch {
  queue = []
  clearStorage()
  // no return: fetch resolves with undefined
}
```

Whoever was waiting in the queue hangs forever, which the user sees as endless loading. Whoever fired the refresh receives `undefined`, and Apollo fails with an error about `headers` that does not point to the interceptor. The tests for a successful refresh keep passing.

There is more, and none of it is spectacular: a filter that matches any URL containing `/graphql`, from any origin, a redirect parameter without encoding, and the state of one tab that does not talk to the other. Because the pieces sit in different places, nobody reads them all at once.

There is also a risk of time, and it is the most common one. Solutions like this are born as a stopgap, with the promise of a definitive version later. Believe me, this happens: the definitive version is postponed, priorities change, and the stopgap becomes the solution. One day a partner's business rule landed in the same file, because the interception point was already there. Whoever touches it now may not even be on the team that wrote it. The solution that looked temporary became permanent, needs to evolve and has no owner. This holds for the patch and also for the shared module: a definitive solution with no owner becomes the next orphan, only better written.

### Why not load the interceptor as an MFE

The first attempt was an MFE with nothing but the interceptor logic. It worked sometimes. single-spa mounts applications as soon as it can, with no guaranteed order, and if the interceptor's MFE loads after another one, the first requests go out unprotected.

In an [issue about registration order](https://github.com/single-spa/single-spa/issues/587), a project member answered: “Single-spa applications should not rely on the order of their registration.” The explanation was that mounting as early as possible avoids loading waterfalls. The recommendation was to move whatever must exist before the apps into the root config or into a utility module. The same answer describes how to force the order, by registering the second app on the `single-spa:first-mount` event, at a cost in performance. In [another issue](https://github.com/single-spa/single-spa/issues/966), a contributor points out that SystemJS also does not guarantee load order and that depending on it is often a sign of trouble.

The two solutions in this post follow that reasoning: the patch in the root config and the utility module.

Two checks in the lab. First, Apollo reads the global `fetch` on every request, in both version 3.14 and 4.3, so a patch installed after the client is created still applies. The failure is in the requests that go out before installation. Second, with the patch loaded as an MFE and randomized load delays, both mount-time requests worked in 6 of 20 attempts. With the patch installed in the shell, 20 of 20. The delays are my parameters and change the percentage. The mechanism does not change.

The [single-spa FAQ](https://single-spa.js.org/docs/faq/) suggests a shared authentication utility module, and the word misleads. A utility, according to the [module types page](https://single-spa.js.org/docs/module-types/), is a plain module that others import, with no lifecycle of its own. It is not an application registered in single-spa. That is why order does not depend on the router: whoever needs `authFetch` imports it, and the import graph guarantees it exists before it is used.

## Several tabs and the duplicated module

With two tabs open, each tab's refreshes also collide. In the lab, with two tabs and an expired token, the baseline made 4 refreshes and lost the session in 10 of 10 attempts. Both solutions made 1 refresh and were ok in 10 of 10.

In the lab's Chromium, served from `localhost`, protection across tabs comes from `navigator.locks`: one renewal at a time per origin, and whoever waits rereads the storage inside the lock, because another tab may have renewed in the meantime. That undid a conclusion I expected to draw about the shared module. I made one MFE bundle its own copy of `authFetch` instead of using the import map's, and I expected one refresh per copy to come back. It did not: with the lock, the duplicated copy still made 1 refresh in 15 of 15. Without the lock, the duplicated copy made 2 refreshes and lost the session in 15 of 15, and the single import-map instance stayed ok. The duplicated module is protected by the lock, and the import map is protected by there being only one instance. This cross-tab guarantee depends on Web Locks being available in a secure context. Without the API, the fallback preserves single-flight inside each instance but does not coordinate tabs.

## When to use each one

The patch fits when the team fixing the problem does not control the MFEs. It is the shortest change and no MFE needs to be altered. The cost is an implicit contract: whoever reads an MFE's code does not see that `fetch` was swapped, and someone has to own the orchestrator and the patch. Before choosing, check that all the MFEs use `fetch`.

The shared module fits when the MFEs can be migrated. Each one declares the dependency. In return, the migration costs a PR, a build setting and a deploy per MFE, and every consumer shares the module's versions.

Both fix the collision. Choosing between them is deciding where to pay: once, at a hidden point, or many times, explicitly.

## Limitations

- The scale simulator runs the real client and auth-package logic, but with no browser, React or single-spa. It does not model several tabs. That case is in the browser benchmark, with few attempts.
- The result across tabs depends on `navigator.locks`, available in secure contexts and scoped to the same origin. Without that API, the lab's fallback does not prevent concurrent refreshes across tabs.
- Strict rotation, a fixed 150 ms refresh latency and “any refresh failure drops the session” are my decisions. They define part of the baseline's logout percentages. The shape of the curve, with failure growing together with the number of MFEs, is the robust result. The absolute values are not.
- The lab's rotation leeway is simpler than Auth0's: it accepts any reuse up to N seconds after the first use, while Auth0 only accepts the immediately previous token.
- Almost all browser scenarios are deterministic by construction, so repeating 15 times does not produce 15 independent samples. The exception is load order, which depends on randomized delays.
- The scenario with a 401 on a valid token compares different things: the baseline does not handle 401, and `authFetch` was written to handle it. The gain comes from that feature, not from where it lives.
- I only tested Apollo. The reasoning holds for other HTTP clients, such as Axios with interceptors, but I did not measure them.
- The global-interceptor risks above come from a code audit. They have no numbers here.
- The lab numbers are synthetic and come from one machine, one Chromium and Apollo Client 3.14.

## Reproduce

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/005-fetch-interceptor-tradeoffs/lab
npm install
npm run up
```

Open `http://localhost:4180/?variant=baseline`, pick a strategy in the panel (`baseline`, `patch` or `utility`, in the URL), open a product, use “Vencer token” and click “Voltar”. To repeat the measurements:

```bash
npm run benchmark   # browser, with Playwright
npm run scale       # simulated users in Node
```

## References

- single-spa: [FAQ](https://single-spa.js.org/docs/faq/), [module types](https://single-spa.js.org/docs/module-types/) and issues [#587](https://github.com/single-spa/single-spa/issues/587) (registration order) and [#966](https://github.com/single-spa/single-spa/issues/966) (load order)
- Auth0: [Configure refresh token rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation)
- WorkOS: [OAuth refresh token race condition](https://workos.com/blog/oauth-refresh-token-race-condition)
- OpenReplay: [Fix token refresh race with the Web Locks API](https://blog.openreplay.com/fix-token-refresh-race-web-locks-api/)
- Axios: [fetch adapter](https://github.com/axios/axios/blob/v1.x/README.md#fetch-adapter)
- Apollo Client: [HttpLink](https://www.apollographql.com/docs/react/api/link/apollo-link-http)
- MDN: [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
