export type MaybePromise<Value> = Value | Promise<Value>

export type Handler<Args extends unknown[], Value> = (...args: Args) => MaybePromise<Value>

export type GuardBlocked = {
  status: 'blocked'
  guard: string
  reason?: unknown
}

export type GuardExecuted<Value> = {
  status: 'executed'
  value: Value
}

export type GuardedResult<Value> = GuardExecuted<Value> | GuardBlocked

export type GuardedHandler<Args extends unknown[], Value> = (
  ...args: Args
) => Promise<GuardedResult<Awaited<Value>>>

export type Guard<Args extends unknown[]> = <Value>(
  next: GuardedHandler<Args, Value>,
) => GuardedHandler<Args, Value>

export type GuardDecision = boolean | { allow: true } | { allow: false; reason?: unknown }

export type CreateGuardOptions<Args extends unknown[]> = {
  name: string
  condition: (...args: Args) => MaybePromise<GuardDecision>
  onBlocked?: (context: { args: Args; reason?: unknown }) => MaybePromise<void>
}

export function composeGuards<Args extends unknown[], Value>(
  handler: Handler<Args, Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  const execute: GuardedHandler<Args, Value> = async (...args) => ({
    status: 'executed',
    value: await handler(...args),
  })

  return guards.reduceRight((next, guard) => guard(next), execute)
}

export function createGuard<Args extends unknown[]>(options: CreateGuardOptions<Args>): Guard<Args> {
  return <Value>(next: GuardedHandler<Args, Value>) =>
    async (...args) => {
      const decision = await options.condition(...args)
      const allowed = decision === true || (typeof decision === 'object' && decision.allow)

      if (allowed) {
        return next(...args)
      }

      const reason = typeof decision === 'object' && decision.allow === false
        ? decision.reason
        : undefined

      await options.onBlocked?.({ args, reason })

      return {
        status: 'blocked',
        guard: options.name,
        reason,
      }
    }
}
