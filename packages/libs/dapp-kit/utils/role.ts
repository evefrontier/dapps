import { normalizeSuiAddress } from '@mysten/sui/utils'
import type { CharacterSummary, EntityOwner } from '../types'

/**
 * What the connected wallet is to an entity:
 * - `shell`: it holds the entity's AccessCap (the contract's `access_cap::Owner`)
 * - `controller`: its character is on the entity's access list
 * - `visitor`: anyone else, including no wallet
 *
 * @category Utilities - Access
 */
export type EntityRole = 'shell' | 'controller' | 'visitor'

/**
 * True when two Sui addresses or object ids are the same, ignoring case and
 * leading zeros.
 *
 * @category Utilities - Access
 */
export function sameAddress(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false
  return normalizeSuiAddress(a) === normalizeSuiAddress(b)
}

/**
 * The character bound to a wallet, from the character directory.
 *
 * @category Utilities - Access
 */
export function findCharacterByWallet(
  characters: CharacterSummary[],
  walletAddress: string | null | undefined,
): CharacterSummary | null {
  if (!walletAddress) return null
  return (
    characters.find((character) =>
      sameAddress(character.walletAddress, walletAddress),
    ) ?? null
  )
}

const FULL_ADDRESS = /^0x[0-9a-fA-F]{64}$/

/**
 * Result of {@link resolveNewController}.
 *
 * @category Utilities - Access
 */
export type NewControllerResult =
  | { ok: true; character: CharacterSummary }
  | {
      ok: false
      /**
       * - `invalidAddress`: not 0x and 64 hex digits
       * - `unknownCharacter`: no character is bound to this wallet
       * - `alreadyController`: the character is already on the list
       */
      error: 'invalidAddress' | 'unknownCharacter' | 'alreadyController'
    }

/**
 * Checks a pasted wallet address before adding its character to an entity's
 * access list. Only a wallet bound to a character is accepted, never a
 * character id; the character id it is bound to is what gets stored.
 *
 * @category Utilities - Access
 * @param input - The wallet address as typed or pasted
 * @param characters - The character directory
 * @param controllers - The entity's access list (character ids), or null
 */
export function resolveNewController(
  input: string,
  characters: CharacterSummary[],
  controllers: string[] | null | undefined,
): NewControllerResult {
  const address = input.trim()
  if (!FULL_ADDRESS.test(address)) return { ok: false, error: 'invalidAddress' }
  const character = findCharacterByWallet(characters, address)
  if (!character) return { ok: false, error: 'unknownCharacter' }
  if (controllers?.some((id) => sameAddress(id, character.characterId))) {
    return { ok: false, error: 'alreadyController' }
  }
  return { ok: true, character }
}

/** Inputs of {@link getEntityRole}. @category Utilities - Access */
export interface EntityRoleInput {
  /** Connected wallet, or null when none is */
  walletAddress: string | null | undefined
  /** Holder of the entity's AccessCap */
  entityOwner: EntityOwner | null | undefined
  /** The entity's access list (character ids), or null when it has none */
  controllers: string[] | null | undefined
  /** The wallet's character id, when known */
  characterId: string | null | undefined
}

/**
 * Works out the connected wallet's role on an entity. The shell is checked
 * first, so a shell that is also on the access list is still the shell.
 *
 * @category Utilities - Access
 */
export function getEntityRole(input: EntityRoleInput): EntityRole {
  const { walletAddress, entityOwner, controllers, characterId } = input
  if (!walletAddress) return 'visitor'
  if (sameAddress(walletAddress, entityOwner?.walletAddress)) return 'shell'
  if (
    entityOwner?.kind === 'character' &&
    sameAddress(characterId, entityOwner.holder)
  ) {
    return 'shell'
  }
  if (characterId && controllers?.some((id) => sameAddress(id, characterId))) {
    return 'controller'
  }
  return 'visitor'
}
