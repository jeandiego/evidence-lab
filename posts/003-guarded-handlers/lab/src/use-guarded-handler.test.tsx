import { act, renderHook } from '@testing-library/react'
import { useCallback, useMemo, useState } from 'react'

import { createGuard } from './guards'
import { useGuardedHandler } from './use-guarded-handler'

describe('useGuardedHandler', () => {
  it('uses the guards produced by the current render', async () => {
    const action = vi.fn((value: number) => value * 2)

    const { result } = renderHook(() => {
      const [allowed, setAllowed] = useState(false)
      const handler = useCallback(action, [])
      const guards = useMemo(
        () => [
          createGuard<[number]>({
            name: 'react-state',
            condition: () => allowed,
          }),
        ],
        [allowed],
      )

      return {
        guardedHandler: useGuardedHandler(handler, guards),
        setAllowed,
      }
    })

    await expect(result.current.guardedHandler(2)).resolves.toEqual({
      status: 'blocked',
      guard: 'react-state',
      reason: undefined,
    })
    expect(action).not.toHaveBeenCalled()

    act(() => result.current.setAllowed(true))

    await expect(result.current.guardedHandler(2)).resolves.toEqual({
      status: 'executed',
      value: 4,
    })
    expect(action).toHaveBeenCalledOnce()
  })

  it('preserves identity while handler and guards remain stable', () => {
    const handler = () => 'done'
    const guard = createGuard<[]>({ name: 'always', condition: () => true })

    const { result, rerender } = renderHook(() => {
      const stableHandler = useCallback(handler, [])
      const stableGuards = useMemo(() => [guard], [])
      return useGuardedHandler(stableHandler, stableGuards)
    })

    const first = result.current
    rerender()

    expect(result.current).toBe(first)
  })
})
