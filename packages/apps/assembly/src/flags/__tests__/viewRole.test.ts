import { describe, expect, it } from 'vitest'

import { resolveViewRole } from '../viewRole'

describe('resolveViewRole', () => {
  it('forces the role named by the flag when the panel is enabled', () => {
    expect(resolveViewRole('visitor', 'shell', true)).toEqual({
      role: 'shell',
      preview: true,
    })
  })

  it('uses the actual role for the actual variant', () => {
    expect(resolveViewRole('controller', 'actual', true)).toEqual({
      role: 'controller',
      preview: false,
    })
  })

  it('ignores the flag in builds without the panel', () => {
    expect(resolveViewRole('visitor', 'shell', false)).toEqual({
      role: 'visitor',
      preview: false,
    })
  })

  it('ignores an unknown variant', () => {
    expect(resolveViewRole('visitor', 'admin', true)).toEqual({
      role: 'visitor',
      preview: false,
    })
  })
})
