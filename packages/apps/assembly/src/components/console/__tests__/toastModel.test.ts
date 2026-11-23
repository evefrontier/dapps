import { describe, expect, it, vi } from 'vitest'

import {
  CHAIN_REJECTED,
  performAction,
  shortDigest,
  splitError,
  type Toast,
  TRANSACTION_FAILED,
  UNKNOWN_ERROR,
} from '../toastModel'

const labels = {
  sending: 'Switching the main breaker off',
  done: 'Main breaker switched off',
  failed: "Couldn't switch the main breaker off",
}

const MOVE_ABORT =
  'Dry run failed, could not automatically determine a budget: MoveAbort(MoveLocation { module: access, function: 4, instruction: 18 }, 2) in command 0'

describe('splitError', () => {
  it('shows a short wallet error as it is', () => {
    expect(splitError(new Error(' No wallet connected. '))).toEqual({
      detail: 'No wallet connected.',
    })
  })

  it('folds a chain error under Show details', () => {
    expect(splitError(new Error(MOVE_ABORT))).toEqual({
      detail: CHAIN_REJECTED,
      raw: MOVE_ABORT,
    })
  })

  it('folds any long error under Show details', () => {
    const long = 'x'.repeat(121)
    expect(splitError(new Error(long))).toEqual({
      detail: TRANSACTION_FAILED,
      raw: long,
    })
  })

  it('falls back for something that is not an Error, or an empty one', () => {
    expect(splitError('nope')).toEqual({ detail: UNKNOWN_ERROR })
    expect(splitError(new Error(''))).toEqual({ detail: UNKNOWN_ERROR })
  })
})

describe('shortDigest', () => {
  it('keeps the first and last four characters', () => {
    expect(shortDigest('8Kx2UeQhWv5nB3pRtY7cLm9dA1sFgH4jZ6kXoPqm4T')).toBe(
      '8Kx2…qm4T',
    )
  })

  it('leaves a short digest alone', () => {
    expect(shortDigest('ABC123')).toBe('ABC123')
  })
})

describe('performAction', () => {
  const setup = (send: () => Promise<{ digest?: string }>) => {
    const shown: (Toast | null)[] = []
    const refetch = vi.fn(() => Promise.resolve())
    const run = () =>
      performAction({
        labels,
        send: send as never,
        show: (toast) => shown.push(toast),
        refetch,
      })
    return { shown, refetch, run }
  }

  it('shows Sending, then Done, and refetches straight away', async () => {
    const { shown, refetch, run } = setup(() =>
      Promise.resolve({ digest: 'D1G' }),
    )
    await expect(run()).resolves.toBe(true)
    expect(shown).toEqual([
      { kind: 'sending', title: labels.sending },
      { kind: 'done', title: labels.done, digest: 'D1G' },
    ])
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows Failed with the error and does not refetch', async () => {
    const { shown, refetch, run } = setup(() =>
      Promise.reject(new Error('No wallet connected.')),
    )
    await expect(run()).resolves.toBe(false)
    expect(shown[1]).toEqual({
      kind: 'failed',
      title: labels.failed,
      detail: 'No wallet connected.',
    })
    expect(refetch).not.toHaveBeenCalled()
  })

  it('clears the toast when the send returns no digest', async () => {
    const { shown, refetch, run } = setup(() => Promise.resolve({}))
    await expect(run()).resolves.toBe(true)
    expect(shown[shown.length - 1]).toBeNull()
    expect(refetch).not.toHaveBeenCalled()
  })

  it('resolves only once the refetch has', async () => {
    let refetched!: () => void
    const done = performAction({
      labels,
      send: () => Promise.resolve({ digest: 'D1G' }) as never,
      show: () => {},
      refetch: () => new Promise<void>((resolve) => (refetched = resolve)),
    })
    let settled = false
    done.then(() => (settled = true))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(settled).toBe(false)
    refetched()
    await expect(done).resolves.toBe(true)
  })

  it('ignores a failed refetch', async () => {
    const failing = performAction({
      labels,
      send: () => Promise.resolve({ digest: 'D1G' }) as never,
      show: () => {},
      refetch: () => Promise.reject(new Error('offline')),
    })
    await expect(failing).resolves.toBe(true)
  })
})
