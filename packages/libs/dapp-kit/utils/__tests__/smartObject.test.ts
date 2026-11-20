import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from '../constants'
import { readObjectSelection, toFetchObjectDataInput } from '../smartObject'

describe('readObjectSelection', () => {
  it('prefers the env object ID and reads the tenant from the query', () => {
    expect(readObjectSelection('?itemId=42&tenant=utopia', '0xabc')).toEqual({
      objectId: '0xabc',
      tenant: 'utopia',
      isObjectIdDirect: true,
    })
  })

  it('falls back to the itemId query param', () => {
    expect(readObjectSelection('?itemId=42', undefined)).toEqual({
      objectId: '42',
      tenant: DEFAULT_TENANT,
      isObjectIdDirect: false,
    })
  })

  it('returns null when no object is selected', () => {
    expect(readObjectSelection('?tenant=utopia', undefined)).toBeNull()
  })
})

describe('toFetchObjectDataInput', () => {
  it('builds an objectId or itemId input', () => {
    expect(toFetchObjectDataInput('0xabc', 'utopia', true)).toEqual({
      objectId: '0xabc',
    })
    expect(toFetchObjectDataInput('42', 'utopia', false)).toEqual({
      itemId: '42',
      selectedTenant: 'utopia',
    })
  })
})
