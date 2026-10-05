---
title: "State ownership: has your global store become a second source of truth?"
emphasis: "second source of truth?"
description: "Copying a remote snapshot into a global store feels convenient until the domain evolves. The lab measures the divergence and maintenance created by that decision."
number: "004"
slug: 004-state-ownership
lang: en
date: 2026-10-05
status: review
thesis: "When the server owns the state, duplicating its snapshot in a global store turns consistency into manual synchronization and increases the risk of divergence as the domain evolves."
tags: [react, zustand, tanstack-query, state-management, architecture, frontend]
demo:
  kind: live
evidence:
  - ../lab/reports/contract-evolution-benchmark.json
  - ../lab/reports/state-ownership-classification.json
  - ../docs/history-audit.md
  - ../docs/sources.md
repo: https://github.com/jeandiego/evidence-lab/tree/main/posts/004-state-ownership
---

In many React applications, the global store arrives before the state model. Some data needs to cross several screens, so the store looks like the natural home for the user, cart, draft, selected unit, settings, and complete API responses.

Some of that data belongs to the server. Once we also keep it in a mutable client copy, every mutation has to keep both representations synchronized. The library matters less here than the question that came too late: who owns this state?

## A seemingly simple change

The lab starts with Luna, who is covered by a plan and has a free appointment. The user selects Thor, whose appointment is private pay.

The server returns a new snapshot:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PRIVATE' },
  subtotalCents: 14000,
  discountCents: 2000,
  totalCents: 12000,
  revision: 2,
}
```

In the first architecture, the UI renders a copy of this state held in Zustand. The action updates only the pet:

```ts
applyPetOnly: (serverSnapshot) =>
  set((state) => ({
    snapshot: state.snapshot
      ? { ...state.snapshot, pet: serverSnapshot.pet }
      : serverSnapshot,
  }))
```

The developer may think of the operation as "change the pet" and update the field that expresses that intent. The server treated the same operation as a change to coverage, price, discount, total, and revision.

The UI ends up with this state:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PLAN' },
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  revision: 1,
}
```

Thor appears with Luna's financial data. TypeScript does not complain, the application throws no exception, and every required field is still present. Each value is valid on its own. The combination should never exist.

## The action describes the button, not the domain transition

"Change the pet" describes the UI intent. The backend still has to recalculate other parts of the domain.

The same mismatch appears when:

- changing the patient also changes eligibility and insurance coverage;
- adding a product recalculates discounts and the total;
- selecting a unit changes availability and price;
- changing the payment method invalidates previous conditions;
- removing a transaction affects both the draft and another copy of the cart.

The spread only exposes an earlier decision: the client is rebuilding an entity the server already knows how to produce.

## The domain grew. Who remembered the action?

To observe contract evolution, I added two fields calculated by the server:

```ts
subtotalCents: number
discountCents: number
```

I compared a manual projection that listed the known fields with replacing the query data using the canonical response.

With the manual projection, the code kept compiling and the old fields remained correct. The two new fields never reached the copy. That produced two divergences, and the action needed another edit.

The reconciliation code in the second strategy stayed the same:

```ts
queryClient.setQueryData(labStateKey, serverSnapshot)
```

The UI still needs a change if it should display the discount. The reconciliation layer no longer maintains another field list whose only job is to update a remote copy.

This benchmark measures change amplification in synchronization code. It does not compare speed, memory, or render counts between Zustand and TanStack Query.

## A real application

The lab isolates the mechanism. To see its scale, I audited a real scheduling application used by more than one million people. I anonymized the product and company while keeping file and line evidence for every classification.

I found 23 synchronization operations around the main store:

| Classification | Operations |
| --- | ---: |
| Avoidable | 6 |
| Simplifiable | 13 |
| Legitimate | 2 |
| Inconclusive | 2 |

I classified an operation as avoidable when it copied server-owned state that could remain under a server state layer. That classification assumes a different architecture. Deleting the current code without that architecture would be unsafe.

The simplifiable cases would still need some reconciliation, although it could be narrower or centralized. Changing libraries does not remove optimistic updates, workflow persistence, or local projections.

The 19 avoidable or simplifiable operations are places where the architecture depends on manual synchronization. I did not find 19 production bugs. I found 19 places where the risk of introducing one is higher because a domain change depends on somebody remembering to keep another representation coherent.

They included operations that:

- copied a complete remote response into the store and also mirrored its products in `cart`;
- received a mutation response but updated the store from the submitted input;
- changed the selected patient and its representation in a separate collection;
- removed backend data and rebuilt the draft, transactions, and cart;
- manually preserved field lists during cleanup and persistence.

Each solution makes sense in isolation. Together, they leave the same information under several representations and several writers. A contract change can reach one of those paths and miss the others.

I also reviewed the latest 200 non-merge commits. The criterion was conservative: a commit message was not enough. The diff had to show a correction for stale state, related fields updated separately, diverging local copies, or a remote field omitted by the client.

Seven commits matched, or 3.5% of the reviewed window. The fixes cleared a unit that remained selected, restored a payment method together with its payment context, reconciled a cart after another flow changed it, and added a remote field that had been left out of the consumed contract.

A server state layer would not necessarily have eliminated all seven commits. The result supports a narrower claim: the team repeatedly returned to synchronization points to restore coherence between related representations.

## What belongs in the store

I would use Zustand without hesitation for state owned by the client, such as:

- shared interaction and presentation state;
- temporary workflow progress;
- preferences that have not been persisted;
- local coordination across components;
- data with no canonical remote source.

Redux, Context, and other stores serve the same kinds of state. TanStack Query and Apollo treat remote data as server state, but some mutations still require invalidation, refetching, optimistic updates, rollback, or coordinated query updates.

A server state tool starts with the server as the owner of remote data. A generic store accepts any data, including a copy of that remote data. Once we choose the copy, we also take responsibility for its coherence protocol.

## The common mistake and an alternative

Calling `set` is only the mechanism. The risk appears when a canonical server snapshot is rebuilt field by field in a second mutable source:

```ts
onSuccess: (snapshot) => {
  useScheduleStore.setState((state) => ({
    ...state,
    pet: snapshot.pet,
    coverage: snapshot.coverage,
    totalCents: snapshot.totalCents,
    // did anyone remember subtotalCents, discountCents, and revision?
  }))
}
```

If the response already represents the confirmed resource, the remote cache can receive the complete snapshot:

```ts
onSuccess: (snapshot) => {
  queryClient.setQueryData(['schedule', scheduleId], snapshot)
}
```

Sometimes a mutation response does not contain everything used by the screens. The related queries can be invalidated and fetched again:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] })
}
```

Neither option makes reconciliation automatic in every scenario. They reduce the application code responsible for manually rebuilding an entity owned by the server.

## Four kinds of state that often end up in the same store

These categories are a heuristic, not a rigid taxonomy. One screen can use all four at once, with a different owner for each.

### URL state

Search, pagination, and sorting belong in the URL when reloading, going back, or sharing the link should preserve them:

```ts
const params = new URLSearchParams(window.location.search)
const page = Number(params.get('page') ?? 1)
const orderBy = params.get('orderBy') ?? 'distance'
```

Copying those values into a store creates a synchronization job across the store, URL, and browser navigation. When the URL already provides the desired behavior, it can remain the source of truth.

### Form state

Text that someone is still typing belongs to the form, not to the confirmed remote resource:

```tsx
const [coupon, setCoupon] = useState('')

<input
  value={coupon}
  onChange={(event) => setCoupon(event.target.value)}
/>
```

After submission, the form can be cleared and the confirmed response can move into the remote cache. `dirty`, `touched`, validation errors, and values that have not been submitted remain with the form.

### HTTP/server state

A schedule loaded from an API has loading, error, freshness, and invalidation concerns. The server is the authority, and the client holds a cache of that authority:

```ts
const scheduleQuery = useQuery({
  queryKey: ['schedule', scheduleId],
  queryFn: () => getSchedule(scheduleId),
})
```

That cache may still need optimistic updates and rollback. Its mechanisms were designed around the lifecycle of remote data.

### Global/client state

A shared interaction with no canonical remote source is a natural fit for a store:

```ts
const useUiStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
```

The server does not decide whether the sidebar is open. No HTTP response can make that boolean stale. The store owns this state instead of acting as another owner's replica.

## Testing the action is not enough

"But the action is tested" often ends the discussion too early. The test may only prove that the setter did exactly what it was programmed to do:

```ts
expect(store.pet.id).toBe('thor')
```

That test passes with a semantically broken snapshot.

Here is the uncomfortable part: the action can work while the domain remains wrong. A green test confirms the action's implementation. By itself, it says nothing about the invariant that action should preserve.

A more useful invariant would be:

> After an operation confirmed by the server, the source rendered by the UI cannot combine fields from different revisions.

In the lab, the diff compares pet, coverage, price, subtotal, discount, total, and revision. Besides checking the setter, the test verifies that the resulting state still represents a possible version of the domain. An implementation test can stay, provided the invariant is covered too.

## The question that comes before the tool

Before adding a store, I would ask:

1. What is the canonical source for this data?
2. Does it represent a remote entity or a local interaction?
3. Should it reflect changes made elsewhere or on another device?
4. How many representations will exist in the client?
5. How many paths can write it?
6. If the contract gains a field tomorrow, which places need to know?

The answers determine the mechanism. If the server owns the data, copying it into a store turns consistency into manual synchronization. As the domain grows, every synchronization point becomes another place that must follow the change.

Zustand remains a good option for state owned by the client. For remote state, the decision must include the cost of maintaining another source of truth.

## Limitations

- The lab uses a small domain and an intentional divergence.
- The benchmark adds two fields to one action; other changes may produce different amplification.
- The real application audit is a snapshot of the analyzed version and an architectural classification, not a count of production bugs.
- The history review covers 200 non-merge commits and uses the commit as its unit. It does not measure severity, production incidence, or the product's entire history.
- Remote and local state can form mixed cases; ownership is not always binary.
- The experiment does not compare library performance.

## Reproduce it

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/004-state-ownership/lab
npm install
npm run dev
```

Open `http://localhost:4174/?variant=a1`, switch from Luna to Thor, and compare the server snapshot with the source rendered by the UI. Then run variant A2.

To regenerate the contract evolution benchmark:

```bash
npm run benchmark:contract
```

## References

- React: [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) and [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- React: [`<input>`](https://react.dev/reference/react-dom/components/input) and [`<form>`](https://react.dev/reference/react-dom/components/form)
- MDN: [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) and [`History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- TanStack Query: [Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries), [Invalidations from Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations), and [Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses)
- Apollo Client: [Caching in Apollo Client](https://www.apollographql.com/docs/react/caching/overview) and [Updating the cache after a mutation](https://www.apollographql.com/docs/react/data/mutations#updating-the-cache-directly)
- Zustand: [Introduction](https://zustand.docs.pmnd.rs/getting-started/introduction) and [`create`](https://zustand.docs.pmnd.rs/apis/create)
- IETF: [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
