import type { EntityMetadata } from '@evefrontier/dapp-kit'
import { describe, expect, it } from 'vitest'

import {
  checkDetails,
  detailsChanged,
  detailsDraft,
  editableDetails,
  NO_DETAILS,
  URL_ERROR,
} from '../details'

const metadata: EntityMetadata = {
  name: 'Halcyon Anchor',
  description: 'Forward refuelling post',
  url: 'https://kestrel.example/halcyon',
}

describe('editableDetails', () => {
  it('gives the shell and controllers the saved details', () => {
    expect(editableDetails(metadata, true, false)).toBe(metadata)
  })

  it('gives visitors nothing to edit, flag or not', () => {
    expect(editableDetails(metadata, false, true)).toBeNull()
  })

  it('has nothing to edit without a Metadata component', () => {
    expect(editableDetails(null, true, false)).toBeNull()
  })

  it('starts from empty details without a Metadata component when the flag is on', () => {
    expect(editableDetails(null, true, true)).toEqual(NO_DETAILS)
  })
})

describe('detailsDraft', () => {
  it('starts from the saved details', () => {
    expect(detailsDraft(metadata)).toEqual(metadata)
  })
})

describe('detailsChanged', () => {
  it('is false for the saved details', () => {
    expect(detailsChanged(detailsDraft(metadata), metadata)).toBe(false)
  })

  it('ignores surrounding whitespace', () => {
    expect(
      detailsChanged({ ...metadata, name: '  Halcyon Anchor ' }, metadata),
    ).toBe(false)
  })

  it('sees a change to any field', () => {
    expect(detailsChanged({ ...metadata, name: 'Halcyon' }, metadata)).toBe(
      true,
    )
    expect(detailsChanged({ ...metadata, description: '' }, metadata)).toBe(
      true,
    )
    expect(detailsChanged({ ...metadata, url: '' }, metadata)).toBe(true)
  })
})

describe('checkDetails', () => {
  it('trims every field', () => {
    expect(
      checkDetails({
        name: ' Halcyon ',
        description: ' A post\n',
        url: ' https://kestrel.example ',
      }),
    ).toEqual({
      ok: true,
      details: {
        name: 'Halcyon',
        description: 'A post',
        url: 'https://kestrel.example',
      },
    })
  })

  it('allows an empty URL, which clears the dapp', () => {
    expect(checkDetails({ ...metadata, url: '  ' })).toEqual({
      ok: true,
      details: { ...metadata, url: '' },
    })
  })

  it('saves a URL typed without a scheme as https', () => {
    expect(
      checkDetails({ ...metadata, url: 'kestrel.example/halcyon' }),
    ).toEqual({
      ok: true,
      details: { ...metadata, url: 'https://kestrel.example/halcyon' },
    })
  })

  it('refuses a URL the Dapp tab would not load', () => {
    for (const url of [
      'http://kestrel.example',
      'javascript:alert(1)',
      'not a url',
    ]) {
      expect(checkDetails({ ...metadata, url })).toEqual({
        ok: false,
        error: URL_ERROR,
      })
    }
  })
})
