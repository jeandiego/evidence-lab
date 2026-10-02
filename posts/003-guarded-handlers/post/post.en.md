---
title: "Guards for frontend handlers: when does a precondition become architecture?"
emphasis: "when does a precondition become architecture?"
description: "Composable guards centralize recurring preconditions without replacing a local if. The lab compares structure, change cost, and runtime overhead."
number: "003"
slug: 003-guarded-handlers
lang: en
date: 2026-10-02
status: review
thesis: "When an interaction precondition recurs across different actions, a composable guard can centralize blocking behavior and make order explicit. For a local condition, an if remains simpler."
tags: [typescript, react, frontend, architecture, handlers]
demo:
  kind: live
# Vídeo para o LinkedIn; no site a demo ao vivo tem prioridade. A capa alimenta o card OG.
video: ./assets/reel-003.mp4
poster: ./assets/reel-003-poster.jpg
evidence:
  - ../evidence/behavior-matrix.json
  - ../evidence/structural-metrics.json
  - ../evidence/change-amplification.json
  - ../evidence/runtime-benchmark.json
repo: https://github.com/jeandiego/evidence-lab/tree/main/posts/003-guarded-handlers
---

An `if` at the start of a handler is not a problem:

```tsx
function handleOpen() {
  if (!selectedItem) return
  openItem(selectedItem)
}
```

The rule is short, specific to that interaction, and exactly where I would expect to find it. Extracting it would only add another concept.

The situation changes when connectivity, permission, and confirmation recur across different actions:

```ts
async function handleDelete(article: Article) {
  if (!isOnline()) {
    showOfflineMessage()
    return
  }

  if (!canDelete(article)) {
    showPermissionMessage()
    return
  }

  if (!await confirmDeletion(article)) return
  await deleteArticle(article)
}
```

Connectivity, permission, and confirmation may also appear when publishing, archiving, or changing another resource. If every handler assembles the sequence independently, the order of checks, the response to a block, and the decision about what may run next are all repeated.

That was the context in which I used composable guards for handlers in a real application. I found the composed version easier to read. I could see the sequence of requirements at the point of use and reach the action without keeping as many branches in my head. The lab does not measure that perception, productivity, or bug reduction. ~Use it at your own risk~.

## The contract

A guard receives the next function in the chain and returns another handler. It can call `next` to continue or return a blocked result without running the remaining steps:

```ts
type GuardedResult<Value> =
  | { status: 'executed'; value: Value }
  | { status: 'blocked'; guard: string; reason?: unknown }

type GuardedHandler<Args extends unknown[], Value> =
  (...args: Args) => Promise<GuardedResult<Awaited<Value>>>

type Guard<Args extends unknown[]> =
  <Value>(next: GuardedHandler<Args, Value>) =>
    GuardedHandler<Args, Value>
```

The intent is close to [Chain of Responsibility](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610): a request moves through a sequence of handlers and each step decides whether to pass it on. The structure also resembles Decorator because every guard wraps a function with another function that has the same contract. Their purposes differ here because a guard may stop the chain.

Composition is a right-to-left reduction:

```ts
function composeGuards<Args extends unknown[], Value>(
  handler: (...args: Args) => Value | Promise<Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  const execute: GuardedHandler<Args, Value> = async (...args) => ({
    status: 'executed',
    value: await handler(...args),
  })

  return guards.reduceRight((next, guard) => guard(next), execute)
}
```

This is function composition, not the Composite pattern. [MDN uses `reduceRight` to demonstrate function composition](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight#defining_composable_functions). The `next => handler` signature is also close to the [middleware model documented by Redux](https://redux.js.org/understanding/history-and-design/middleware), where each function wraps the next one in the chain.

For `composeGuards(handler, [online, permission, confirmation])`, the order is:

```text
online → permission → confirmation → handler
```

The original arguments travel through the chain. If `permission` does not call `next`, neither confirmation nor the handler runs. An expected block becomes a value; unexpected errors remain exceptions.

This distinction matters for handlers that return `void`. Without an explicit result, `undefined` could mean that the action ran or that a guard blocked it. The discriminated union wraps the successful result, preserves the action value, and identifies the policy that stopped the flow:

```ts
const result = await publishArticle(article)

if (result.status === 'executed') {
  showReceipt(result.value)
}
```

Narrowing by `status` follows TypeScript's [discriminated union mechanism](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions).

A failure in the API, condition, or blocking effect rejects the promise as usual. Cancelling a confirmation is not treated as an exception.

## Policies at the point of use

In the lab, publishing, archiving, and deleting articles share some policies:

```ts
return {
  publish: composeGuards(execute('publish'), [
    online,
    editorialLock,
    permission('publish'),
    content,
    confirmation('publish'),
  ]),
  archive: composeGuards(execute('archive'), [
    online,
    editorialLock,
    permission('archive'),
  ]),
  delete: composeGuards(execute('delete'), [
    online,
    editorialLock,
    permission('delete'),
    confirmation('delete'),
  ]),
}
```

The list records which policies protect each action and in what order. That remains a developer decision. Checking connectivity before opening a confirmation creates a different experience from requesting confirmation and only then reporting that the application is offline.

The core is plain TypeScript. In React, the hook recomposes the chain whenever the handler or guards change:

```ts
function useGuardedHandler<Args extends unknown[], Value>(
  handler: Handler<Args, Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  return useMemo(
    () => composeGuards(handler, guards),
    [handler, guards],
  )
}
```

This follows React's normal closure semantics. When state or props change, the consumer must recreate the guards with the correct dependencies. The returned function keeps its identity while `handler` and `guards` keep their references.

React documents both [state captured as a snapshot by each render](https://react.dev/learn/state-as-a-snapshot) and [`useMemo` recalculation when a dependency changes](https://react.dev/reference/react/useMemo). `useMemo` remains a React optimization, not a semantic guarantee that the guards contract should require.

I also included Angular and Vue examples to show how a condition could read reactive state outside React. They are illustrative examples, without executable builds or claims of complete framework support.

## The experiment

I implemented the same three actions in three ways:

1. composable guards;
2. early-return conditionals;
3. nested conditionals in a monolithic handler.

The variants receive the same dependencies and return the same `GuardedResult`. The matrix compares the result, the exact order of checks and effects, and error propagation. There were 18 applicable scenarios and 54 observations. All three implementations behaved identically in every case, which is necessary for the structural comparison to be meaningful.

## Where the complexity went

The structural metrics were extracted from the TypeScript AST:

| Variant | Non-empty lines | `if` | Decision points | Maximum nesting | Policy references |
| --- | ---: | ---: | ---: | ---: | ---: |
| Guards (handlers) | 40 | 0 | 0 | 0 | 5 |
| Guards (infrastructure) | 53 | 1 | 5 | 1 | 0 |
| Early return | 34 | 12 | 12 | 1 | 12 |
| Monolithic | 62 | 12 | 12 | 5 | 12 |

In this sample, the guarded handlers and their infrastructure total 93 lines, compared with 34 for early returns. The abstraction costs 53 lines before it is reused. In exchange, translating domain conditions into blocked results moves out of the three handlers and into the infrastructure. The composition point still decides which policies to use and in what order.

The early-return version is the smallest and keeps nesting to one level. I would choose it while repetition remained limited or if each action needed a different response to the same condition.

## What happens when a new policy appears

To observe a change, I froze the previous state of all three variants and defined the protocol before implementation: add `editorial-lock` after connectivity and before permission in publish, archive, and delete.

| Variant | Handlers touched | `allow/block` translations | Wiring | Branches added | Nesting | Physical diff `+/-` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Guards | 3 | 1 | 3 | 0 | 0 → 0 | +4/−1 |
| Early return | 3 | 3 | 0 | 3 | 1 → 1 | +3/−0 |
| Monolithic | 3 | 3 | 0 | 3 | 4 → 5 | +33/−21 |

All three approaches touched all three handlers, as expected. The guards only centralized the explicit `allow/block` translation and avoided adding branches to the handlers. The policy still had to be wired into all three lists.

The physical early-return change was smaller: three added lines, one complete decision in each handler. In the monolithic version, inserting a step in the middle of the tree required restructuring the blocks and increased maximum nesting from four to five.

## Runtime cost

A microbenchmark isolated the successful synchronous publish path while keeping the asynchronous contract. For each variant, the script first ran 2,000 calls that were not measured. This initial pass reduces the influence of runtime initialization and optimization. It then recorded nine samples of 20,000 operations:

| Variant | Median | p95 across samples |
| --- | ---: | ---: |
| Guards | 551 ns/op | 676 ns/op |
| Early return | 37 ns/op | 57 ns/op |
| Monolithic | 36 ns/op | 55 ns/op |

Environment: Apple M3 Pro, Node 24.11.1, macOS arm64.

In the isolated test, the guarded version was about 15 times slower than the alternatives. The ratio looks large, but the absolute difference was approximately 0.5 microseconds per call, or half of one millionth of a second.

Chaining and awaiting the steps has a cost, but it is very small in absolute terms. The benchmark isolates that orchestration alone. A real handler usually renders UI, opens a dialog, accesses the network, or performs other I/O at much larger time scales. These measurements therefore do not show that a user would notice a difference.

## Not every workflow should become a guard

The pattern came from a real case where one action mixed processing state, asynchronous confirmation, partial unavailability, a branch for “more options,” the selection itself, and cleanup in a `finally` block.

Putting everything into a chain would replace a difficult handler with difficult middleware. The branch, transient state, and cleanup belonged to the action. The recurring policies were better candidates: confirming a change and handling unavailable items.

```ts
const selectWithPolicies = composeGuards(selectOption, [
  requireOfferChangeConfirmation(activeOffer),
  requireAvailableItems({
    unavailableItems,
    openDialog: openUnavailableItemsDialog,
  }),
])

async function handleSelectOption(option: Option) {
  setProcessing(option.id)

  try {
    if (option.kind === 'more-options') {
      return openMoreOptions(option)
    }

    return await selectWithPolicies(option)
  } finally {
    clearProcessing()
  }
}
```

Here, guards extract the shared preconditions and the rest of the workflow stays in the handler.

## The security boundary

A frontend guard controls the interface flow. It can avoid an unnecessary request, explain a block, or request confirmation. Anyone can still bypass the client.

Authorization, integrity, and relevant validation remain mandatory on the backend. A browser-side `requirePermission()` is a UX decision: it anticipates a response the server must also enforce.

[OWASP recommends never relying on client-side access controls](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html#verify-that-authorization-checks-are-performed-in-the-right-location). They may improve the experience, but the decision to grant or deny access must happen on the server, gateway, or serverless function.

## When the abstraction pays for itself

I would consider extracting a guard when:

- the precondition appears in different actions;
- the product needs the same response whenever it blocks;
- its order relative to other policies is part of the behavior;
- composition makes the action requirements clear at the point of use;
- the policy can be tested without knowing the screen.

If the condition belongs to one handler and fits in an early return, I would keep the local `if`.

The guarded version used more code and was slower in the isolated test. Its 53 infrastructure lines, wrapped result, and required team discipline bought centralization and explicit composition. When I added a policy, I did not have to repeat the blocked-result translation, although I still changed all three composition points.

Again, I would keep using an `if` for a local condition. Only when the same precondition appears across actions, has to preserve an order, and should block all of them in the same way does treating it as part of the architecture begin to make sense.

## Limitations

- The editorial domain is small and controlled; it does not represent months of application evolution.
- Lines, branches, and nesting describe this sample. They do not measure readability, quality, or productivity.
- The change experiment adds one policy to three handlers. Other kinds of changes may favor another structure.
- The microbenchmark isolates orchestration and does not predict perceived frontend latency.
- The tests demonstrate order, short-circuiting, types, closures, and identity under the evaluated conditions; they do not prove bug reduction in a team.
- A custom guard may still violate the contract and call `next` more than once.

## Reproduce it

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/003-guarded-handlers/lab
npm install
npm run typecheck
npm test
npm run evidence
npm run dev
```

The raw data and methodology are in [`evidence/`](../evidence/). The full contract is in [`docs/contract.md`](../docs/contract.md), and the `GuardedResult` decision is in [`docs/guarded-result.md`](../docs/guarded-result.md).

## References

- Gamma, Helm, Johnson, and Vlissides. [*Design Patterns: Elements of Reusable Object-Oriented Software*](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610). Chain of Responsibility and Decorator.
- [Redux: Middleware](https://redux.js.org/understanding/history-and-design/middleware).
- [MDN: `Array.prototype.reduceRight()` and function composition](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight#defining_composable_functions).
- [TypeScript Handbook: Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions).
- [React: State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) and [`useMemo`](https://react.dev/reference/react/useMemo).
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
