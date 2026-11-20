import { describe, expect, it } from 'vitest'

import { failureMessage } from '../useSponsoredAction'

describe('failureMessage', () => {
  it('names the action and the error', () => {
    expect(failureMessage('add Oro', new Error('Rejected'))).toBe(
      'Failed to add Oro: Rejected',
    )
  })

  it('falls back for something that is not an Error', () => {
    expect(failureMessage('switch the main breaker off', 'nope')).toBe(
      'Failed to switch the main breaker off: Unknown error',
    )
  })
})
