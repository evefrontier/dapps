import { describe, expect, it } from 'vitest'

import { FLAG_DEFINITIONS } from '../config'
import { resolveUpdateTransport } from '../updateTransport'

describe('resolveUpdateTransport', () => {
  it('defaults to the subscription', () => {
    const flag = FLAG_DEFINITIONS['assembly-update-transport']
    expect(flag.defaultVariant).toBe('subscription')
    expect(resolveUpdateTransport(flag.defaultVariant)).toBe('subscription')
  })

  it('polls only when the flag says polling', () => {
    expect(resolveUpdateTransport('polling')).toBe('polling')
  })

  it('keeps the subscription for an unknown variant', () => {
    expect(resolveUpdateTransport('sse')).toBe('subscription')
    expect(resolveUpdateTransport('')).toBe('subscription')
  })
})
