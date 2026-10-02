import { composeGuards, createGuard, type Guard } from './guards'

describe('composeGuards', () => {
  it('runs guards in declaration order and preserves arguments and return value', async () => {
    const calls: string[] = []
    const record = (name: string): Guard<[number]> =>
      createGuard({
        name,
        condition: (value) => {
          calls.push(`${name}:${value}`)
          return true
        },
      })

    const guarded = composeGuards(
      (value: number) => {
        calls.push(`handler:${value}`)
        return value * 2
      },
      [record('first'), record('second')],
    )

    await expect(guarded(21)).resolves.toEqual({ status: 'executed', value: 42 })
    expect(calls).toEqual(['first:21', 'second:21', 'handler:21'])
  })

  it('stops at the first blocked guard and exposes its reason', async () => {
    const laterCondition = vi.fn(() => true)
    const handler = vi.fn(() => 'deleted')
    const onBlocked = vi.fn()

    const guarded = composeGuards(handler, [
      createGuard({
        name: 'permission',
        condition: () => ({ allow: false, reason: 'not-owner' }),
        onBlocked,
      }),
      createGuard({ name: 'confirmation', condition: laterCondition }),
    ])

    await expect(guarded()).resolves.toEqual({
      status: 'blocked',
      guard: 'permission',
      reason: 'not-owner',
    })
    expect(onBlocked).toHaveBeenCalledWith({ args: [], reason: 'not-owner' })
    expect(laterCondition).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('propagates unexpected condition errors', async () => {
    const error = new Error('session unavailable')
    const guarded = composeGuards(() => 'done', [
      createGuard({
        name: 'permission',
        condition: () => {
          throw error
        },
      }),
    ])

    await expect(guarded()).rejects.toBe(error)
  })

  it('propagates handler errors instead of treating them as a block', async () => {
    const error = new Error('delete failed')
    const guarded = composeGuards(
      async () => {
        throw error
      },
      [createGuard({ name: 'online', condition: () => true })],
    )

    await expect(guarded()).rejects.toBe(error)
  })

  it('awaits an asynchronous condition and asynchronous blocked effect in order', async () => {
    const calls: string[] = []
    const handler = vi.fn()
    const guarded = composeGuards(handler, [
      createGuard<[string]>({
        name: 'remote-policy',
        condition: async (id) => {
          await Promise.resolve()
          calls.push(`condition:${id}`)
          return { allow: false, reason: 'remote-denied' }
        },
        onBlocked: async ({ args, reason }) => {
          await Promise.resolve()
          calls.push(`blocked:${args[0]}:${String(reason)}`)
        },
      }),
    ])

    await expect(guarded('article-003')).resolves.toEqual({
      status: 'blocked',
      guard: 'remote-policy',
      reason: 'remote-denied',
    })
    expect(calls).toEqual([
      'condition:article-003',
      'blocked:article-003:remote-denied',
    ])
    expect(handler).not.toHaveBeenCalled()
  })

  it('propagates a rejected asynchronous blocked effect', async () => {
    const error = new Error('telemetry unavailable')
    const guarded = composeGuards(() => 'done', [
      createGuard({
        name: 'blocked',
        condition: async () => false,
        onBlocked: async () => {
          throw error
        },
      }),
    ])

    await expect(guarded()).rejects.toBe(error)
  })
})
