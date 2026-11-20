import { describe, expect, it } from 'vitest'

import { dappSource } from '../dappSource'

describe('dappSource', () => {
  it('appends the item id and tenant to an https URL', () => {
    expect(
      dappSource(
        'https://kestrel.example/halcyon?x=1',
        '1000000070926',
        'stillness',
      ),
    ).toBe(
      'https://kestrel.example/halcyon?x=1&itemId=1000000070926&tenant=stillness',
    )
  })

  it('reads a URL saved without a scheme as https, and leaves out an empty tenant', () => {
    expect(dappSource('kestrel.example', '7', '')).toBe(
      'https://kestrel.example/?itemId=7',
    )
  })

  it('refuses anything that is not https', () => {
    expect(dappSource('http://kestrel.example', '7', 't')).toBeNull()
    expect(dappSource('javascript:alert(1)', '7', 't')).toBeNull()
  })

  it('refuses empty text and text with spaces', () => {
    expect(dappSource('', '7', 't')).toBeNull()
    expect(dappSource('not a url', '7', 't')).toBeNull()
  })
})
