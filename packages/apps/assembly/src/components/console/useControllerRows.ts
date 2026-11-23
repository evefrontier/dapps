import {
  type CharacterSummary,
  type EntityOwner,
  findCharacterByWallet,
  sameAddress,
  useCharacterDirectory,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import { useMemo } from 'react'

/** One row of the Controllers list. */
export interface ControllerRow {
  /** Stable React key */
  key: string
  /** Null for a shell whose character is unknown */
  characterId: string | null
  /** Character name; empty when it has never been named or is unknown */
  name: string
  /** The wallet to show; the character id when the wallet is unknown */
  address: string | null
  isShell: boolean
}

/**
 * The Controllers list as the console shows it: every character on the
 * entity's access list, in on-chain order, plus the shell. The shell is always
 * a controller; when the access list doesn't hold its character (or the entity
 * has no access list yet), its row is added at the end. The shell's row is
 * never removable.
 *
 * When a wallet holds the cap, its character is found in the directory, so
 * until the directory loads (or if it fails) any row could be the shell's:
 * the list is unknown rather than one that would offer to remove the shell.
 *
 * @param controllers - The entity's access list (character ids)
 * @param owner - Who holds the entity's AccessCap
 * @param characters - The character directory; undefined until it loads
 * @returns
 *   - `rows` - The list to show, or null while the shell is unknown
 *   - `shellId` - The shell's character id: the cap's holder when it is parked
 *     on a character, otherwise the character bound to the holding wallet
 */
export function buildControllerRows(
  controllers: string[] | null | undefined,
  owner: EntityOwner | null,
  characters: CharacterSummary[] | undefined,
): { rows: ControllerRow[] | null; shellId: string | null } {
  if (!characters && owner?.kind !== 'character' && owner?.walletAddress) {
    return { rows: null, shellId: null }
  }
  const characterOf = (id: string) =>
    characters?.find((c) => sameAddress(c.characterId, id))
  const shellId =
    owner?.kind === 'character'
      ? owner.holder
      : (findCharacterByWallet(characters ?? [], owner?.walletAddress)
          ?.characterId ?? null)

  const rows: ControllerRow[] = (controllers ?? []).map((id) => {
    const character = characterOf(id)
    return {
      key: id,
      characterId: id,
      name: character?.name ?? '',
      address: character?.walletAddress ?? id,
      isShell: sameAddress(id, shellId),
    }
  })

  if (owner && !rows.some((row) => row.isShell)) {
    const address = owner.walletAddress ?? owner.holder
    if (address || shellId) {
      const shellCharacter = shellId ? characterOf(shellId) : undefined
      rows.push({
        key: `shell:${shellId ?? address}`,
        characterId: shellId,
        name: shellCharacter?.name || owner.character?.metadata?.name || '',
        address: address ?? shellId,
        isShell: true,
      })
    }
  }

  return { rows, shellId }
}

/**
 * {@link buildControllerRows} for the selected entity, with the character
 * directory it needs.
 *
 * @param enabled - False skips the character directory fetch (visitors)
 */
export function useControllerRows(enabled: boolean): {
  /** Null until the shell is known (see {@link buildControllerRows}) */
  rows: ControllerRow[] | null
  /** The shell's character id, when known */
  shellId: string | null
  /** The character directory, once loaded */
  characters: CharacterSummary[] | undefined
  isLoading: boolean
  /** The character directory's load error, if any */
  error: Error | null
} {
  const { entity, entityOwner } = useSmartObject()
  const directory = useCharacterDirectory({ enabled })

  return useMemo(
    () => ({
      ...buildControllerRows(entity?.controllers, entityOwner, directory.data),
      characters: directory.data,
      isLoading: directory.isLoading,
      error: directory.error,
    }),
    [entity, entityOwner, directory.data, directory.isLoading, directory.error],
  )
}
