import { useMemo } from 'react'

import { composeGuards, type Guard, type GuardedHandler, type Handler } from './guards'

export function useGuardedHandler<Args extends unknown[], Value>(
  handler: Handler<Args, Value>,
  guards: readonly Guard<Args>[],
): GuardedHandler<Args, Value> {
  return useMemo(() => composeGuards(handler, guards), [handler, guards])
}
