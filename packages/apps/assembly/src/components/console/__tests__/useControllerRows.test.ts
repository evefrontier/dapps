import type { CharacterSummary, EntityOwner } from '@evefrontier/dapp-kit'
import { describe, expect, it } from 'vitest'

import { buildControllerRows } from '../useControllerRows'

const id = (pair: string) => `0x${pair.repeat(32)}`

const SHELL_WALLET = id('a1')
const SHELL_CHAR = id('a2')
const CTRL_WALLET = id('b1')
const CTRL_CHAR = id('b2')
const UNKNOWN_CHAR = id('c2')

const characters: CharacterSummary[] = [
  { characterId: SHELL_CHAR, name: 'Shell Pilot', walletAddress: SHELL_WALLET },
  { characterId: CTRL_CHAR, name: 'Oro', walletAddress: CTRL_WALLET },
]

const walletOwner: EntityOwner = {
  kind: 'wallet',
  holder: SHELL_WALLET,
  walletAddress: SHELL_WALLET,
  character: null,
}

describe('buildControllerRows', () => {
  it('lists the access list in order, tagging the shell in its place', () => {
    const { rows, shellId } = buildControllerRows(
      [CTRL_CHAR, SHELL_CHAR],
      walletOwner,
      characters,
    )
    expect(shellId).toBe(SHELL_CHAR)
    expect(rows).toEqual([
      {
        key: CTRL_CHAR,
        characterId: CTRL_CHAR,
        name: 'Oro',
        address: CTRL_WALLET,
        isShell: false,
      },
      {
        key: SHELL_CHAR,
        characterId: SHELL_CHAR,
        name: 'Shell Pilot',
        address: SHELL_WALLET,
        isShell: true,
      },
    ])
  })

  it('adds the shell at the end when the access list does not hold it', () => {
    const { rows } = buildControllerRows([CTRL_CHAR], walletOwner, characters)
    expect(rows.map((row) => [row.characterId, row.isShell])).toEqual([
      [CTRL_CHAR, false],
      [SHELL_CHAR, true],
    ])
    expect(rows[1].key).toBe(`shell:${SHELL_CHAR}`)
  })

  it('lists the shell alone when the entity has no access list', () => {
    const { rows } = buildControllerRows(null, walletOwner, characters)
    expect(rows).toHaveLength(1)
    expect(rows[0].isShell).toBe(true)
  })

  it('shows an unknown character by its id', () => {
    const { rows } = buildControllerRows([UNKNOWN_CHAR], null, characters)
    expect(rows).toEqual([
      {
        key: UNKNOWN_CHAR,
        characterId: UNKNOWN_CHAR,
        name: '',
        address: UNKNOWN_CHAR,
        isShell: false,
      },
    ])
  })

  it('takes the holder as the shell when the cap is parked on a character', () => {
    const parked: EntityOwner = {
      kind: 'character',
      holder: SHELL_CHAR,
      walletAddress: SHELL_WALLET,
      character: null,
    }
    const { rows, shellId } = buildControllerRows([], parked, [])
    expect(shellId).toBe(SHELL_CHAR)
    expect(rows).toEqual([
      {
        key: `shell:${SHELL_CHAR}`,
        characterId: SHELL_CHAR,
        name: '',
        address: SHELL_WALLET,
        isShell: true,
      },
    ])
  })

  it('shows a shell wallet with no known character, without an id', () => {
    const { rows, shellId } = buildControllerRows([], walletOwner, [])
    expect(shellId).toBeNull()
    expect(rows).toEqual([
      {
        key: `shell:${SHELL_WALLET}`,
        characterId: null,
        name: '',
        address: SHELL_WALLET,
        isShell: true,
      },
    ])
  })

  it('adds no shell row when nobody holds the cap', () => {
    const none: EntityOwner = {
      kind: 'none',
      holder: null,
      walletAddress: null,
      character: null,
    }
    expect(buildControllerRows([], none, characters).rows).toEqual([])
  })
})
