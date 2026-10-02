import { expectTypeOf } from 'vitest'

import { composeGuards, createGuard, type GuardedResult } from './guards'

describe('GuardedResult', () => {
  it('distinguishes an executed void handler from a blocked handler', async () => {
    const action = vi.fn<() => void>()
    const allow = composeGuards(action, [
      createGuard({ name: 'allowed', condition: () => true }),
    ])
    const block = composeGuards(action, [
      createGuard({ name: 'blocked', condition: () => false }),
    ])

    await expect(allow()).resolves.toEqual({ status: 'executed', value: undefined })
    await expect(block()).resolves.toEqual({
      status: 'blocked',
      guard: 'blocked',
      reason: undefined,
    })
    expect(action).toHaveBeenCalledOnce()
  })

  it('narrows the preserved handler value without a cast', async () => {
    const guarded = composeGuards(
      async (id: string) => ({ id, saved: true as const }),
      [createGuard<[string]>({ name: 'always', condition: () => true })],
    )

    const result = await guarded('article-1')

    expectTypeOf(result).toEqualTypeOf<GuardedResult<{ id: string; saved: true }>>()

    if (result.status === 'executed') {
      expectTypeOf(result.value).toEqualTypeOf<{ id: string; saved: true }>()
      expect(result.value).toEqual({ id: 'article-1', saved: true })
    }
  })

  it('keeps unexpected errors outside the result union', async () => {
    const error = new Error('publish failed')
    const guarded = composeGuards(
      async () => {
        throw error
      },
      [createGuard({ name: 'always', condition: () => true })],
    )

    await expect(guarded()).rejects.toBe(error)
  })
})
