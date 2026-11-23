import { describe, expect, it } from 'vitest'
import type { CharacterSummary, EntityOwner } from '../../types'
import {
  canManage,
  findCharacterByWallet,
  getEntityRole,
  isController,
  isFullAddress,
  needsCharacterDirectory,
  resolveNewController,
  sameAddress,
} from '../role'

const SHELL_WALLET = `0x${'a1'.repeat(32)}`
const SHELL_CHARACTER = `0x${'c1'.repeat(32)}`
const CONTROLLER_WALLET = `0x${'b2'.repeat(32)}`
const CONTROLLER_CHARACTER = `0x${'c2'.repeat(32)}`
const VISITOR_WALLET = `0x${'d4'.repeat(32)}`

const walletOwner: EntityOwner = {
  kind: 'wallet',
  holder: SHELL_WALLET,
  walletAddress: SHELL_WALLET,
  character: null,
}
const characterOwner: EntityOwner = {
  kind: 'character',
  holder: SHELL_CHARACTER,
  walletAddress: SHELL_WALLET,
  character: null,
}

describe('sameAddress', () => {
  it('ignores case and leading zeros', () => {
    expect(sameAddress('0xABC', `0x${'0'.repeat(61)}abc`)).toBe(true)
    expect(sameAddress('0x1', '0x2')).toBe(false)
    expect(sameAddress(null, '0x1')).toBe(false)
  })
})

describe('findCharacterByWallet', () => {
  const characters: CharacterSummary[] = [
    {
      characterId: CONTROLLER_CHARACTER,
      name: 'Oro',
      walletAddress: CONTROLLER_WALLET,
    },
  ]

  it('finds the character bound to a wallet', () => {
    expect(
      findCharacterByWallet(
        characters,
        CONTROLLER_WALLET.toUpperCase().replace('0X', '0x'),
      ),
    ).toBe(characters[0])
    expect(findCharacterByWallet(characters, VISITOR_WALLET)).toBeNull()
    expect(findCharacterByWallet(characters, null)).toBeNull()
  })
})

describe('resolveNewController', () => {
  const characters: CharacterSummary[] = [
    {
      characterId: CONTROLLER_CHARACTER,
      name: 'Oro',
      walletAddress: CONTROLLER_WALLET,
    },
    { characterId: SHELL_CHARACTER, name: 'Ilya', walletAddress: SHELL_WALLET },
  ]

  it('accepts the wallet bound to a character, and returns the character', () => {
    expect(
      resolveNewController(`  ${CONTROLLER_WALLET}  `, characters, null),
    ).toEqual({ ok: true, character: characters[0] })
  })

  it('rejects anything but 0x and 64 hex digits', () => {
    for (const input of [
      '',
      '0x1',
      CONTROLLER_WALLET.slice(2),
      `${CONTROLLER_WALLET}0`,
    ]) {
      expect(resolveNewController(input, characters, [])).toEqual({
        ok: false,
        error: 'invalidAddress',
      })
    }
  })

  it('rejects a character id', () => {
    expect(resolveNewController(CONTROLLER_CHARACTER, characters, [])).toEqual({
      ok: false,
      error: 'unknownCharacter',
    })
  })

  it('rejects a wallet with no character', () => {
    expect(resolveNewController(VISITOR_WALLET, characters, [])).toEqual({
      ok: false,
      error: 'unknownCharacter',
    })
  })

  it('rejects a character already on the list, by id or wallet', () => {
    const controllers = [CONTROLLER_CHARACTER.toUpperCase().replace('0X', '0x')]
    expect(
      resolveNewController(CONTROLLER_WALLET, characters, controllers),
    ).toEqual({ ok: false, error: 'alreadyController' })
  })
})

describe('resolveNewController and the shell', () => {
  const characters: CharacterSummary[] = [
    { characterId: SHELL_CHARACTER, name: 'Ilya', walletAddress: SHELL_WALLET },
  ]

  it("rejects the shell's own wallet: the shell is always a controller", () => {
    expect(
      resolveNewController(SHELL_WALLET, characters, [], SHELL_CHARACTER),
    ).toEqual({ ok: false, error: 'alreadyController' })
  })
})

describe('isFullAddress', () => {
  it('accepts 0x and 64 hex digits, ignoring surrounding whitespace', () => {
    expect(isFullAddress(`  ${SHELL_WALLET} `)).toBe(true)
  })

  it('rejects short, long and unprefixed addresses', () => {
    expect(isFullAddress('0x1')).toBe(false)
    expect(isFullAddress(`${SHELL_WALLET}0`)).toBe(false)
    expect(isFullAddress(SHELL_WALLET.slice(2))).toBe(false)
  })
})

describe('canManage', () => {
  it('is true for the shell and controllers only', () => {
    expect(canManage('shell')).toBe(true)
    expect(canManage('controller')).toBe(true)
    expect(canManage('visitor')).toBe(false)
  })
})

describe('isController', () => {
  it('is true for the shell and for characters on the list', () => {
    expect(isController(SHELL_CHARACTER, [], SHELL_CHARACTER)).toBe(true)
    expect(isController(CONTROLLER_CHARACTER, [CONTROLLER_CHARACTER])).toBe(
      true,
    )
    expect(isController(CONTROLLER_CHARACTER, null, SHELL_CHARACTER)).toBe(
      false,
    )
  })
})

describe('needsCharacterDirectory', () => {
  const base = {
    walletAddress: CONTROLLER_WALLET,
    entityOwner: walletOwner,
    controllers: [CONTROLLER_CHARACTER],
    knownCharacterId: null,
  }

  it('is needed to tell a controller from a visitor', () => {
    expect(needsCharacterDirectory(base)).toBe(true)
  })

  it('is not needed without a wallet, for the shell, or with a known character', () => {
    expect(needsCharacterDirectory({ ...base, walletAddress: null })).toBe(
      false,
    )
    expect(
      needsCharacterDirectory({ ...base, walletAddress: SHELL_WALLET }),
    ).toBe(false)
    expect(
      needsCharacterDirectory({
        ...base,
        knownCharacterId: CONTROLLER_CHARACTER,
      }),
    ).toBe(false)
  })

  it('is not needed when no character could change the answer', () => {
    expect(needsCharacterDirectory({ ...base, controllers: [] })).toBe(false)
    expect(
      needsCharacterDirectory({
        ...base,
        controllers: [],
        entityOwner: characterOwner,
      }),
    ).toBe(true)
  })
})

describe('getEntityRole', () => {
  const base = {
    entityOwner: walletOwner,
    controllers: [SHELL_CHARACTER, CONTROLLER_CHARACTER],
    characterId: null,
  }

  it('is the shell for the AccessCap holder wallet', () => {
    expect(getEntityRole({ ...base, walletAddress: SHELL_WALLET })).toBe(
      'shell',
    )
  })

  it('is the shell when the cap is parked on the wallet’s character', () => {
    expect(
      getEntityRole({
        walletAddress: `0x${'e5'.repeat(32)}`,
        entityOwner: { ...characterOwner, walletAddress: null },
        controllers: null,
        characterId: SHELL_CHARACTER,
      }),
    ).toBe('shell')
  })

  it('stays the shell when the shell is also on the access list', () => {
    expect(
      getEntityRole({
        ...base,
        walletAddress: SHELL_WALLET,
        characterId: SHELL_CHARACTER,
      }),
    ).toBe('shell')
  })

  it('is a controller when the wallet’s character is on the access list', () => {
    expect(
      getEntityRole({
        ...base,
        walletAddress: CONTROLLER_WALLET,
        characterId: CONTROLLER_CHARACTER,
      }),
    ).toBe('controller')
  })

  it('is a visitor otherwise', () => {
    expect(getEntityRole({ ...base, walletAddress: VISITOR_WALLET })).toBe(
      'visitor',
    )
    expect(
      getEntityRole({
        ...base,
        walletAddress: CONTROLLER_WALLET,
        controllers: null,
        characterId: CONTROLLER_CHARACTER,
      }),
    ).toBe('visitor')
    expect(getEntityRole({ ...base, walletAddress: null })).toBe('visitor')
  })
})
