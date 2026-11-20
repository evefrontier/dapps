import {
  type CharacterSummary,
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
 * @param enabled - False skips the character directory fetch (visitors)
 */
export function useControllerRows(enabled: boolean): {
  rows: ControllerRow[]
  /** The shell's character id, when known */
  shellId: string | null
  /** The character directory, once loaded */
  characters: CharacterSummary[] | undefined
  isLoading: boolean
} {
  const { entity, entityOwner } = useSmartObject()
  const directory = useCharacterDirectory({ enabled })

  return useMemo(() => {
    const characters = directory.data ?? []
    const characterOf = (id: string) =>
      characters.find((c) => sameAddress(c.characterId, id))
    // The cap's holder when it is parked on a character, otherwise the
    // character bound to the holding wallet
    const shellId =
      entityOwner?.kind === 'character'
        ? entityOwner.holder
        : (findCharacterByWallet(characters, entityOwner?.walletAddress)
            ?.characterId ?? null)

    const rows: ControllerRow[] = (entity?.controllers ?? []).map((id) => {
      const character = characterOf(id)
      return {
        key: id,
        characterId: id,
        name: character?.name ?? '',
        address: character?.walletAddress ?? id,
        isShell: sameAddress(id, shellId),
      }
    })

    if (entityOwner && !rows.some((row) => row.isShell)) {
      const shellCharacter = shellId ? characterOf(shellId) : undefined
      const address = entityOwner.walletAddress ?? entityOwner.holder
      if (address || shellId) {
        rows.push({
          key: `shell:${shellId ?? address}`,
          characterId: shellId,
          name:
            shellCharacter?.name || entityOwner.character?.metadata?.name || '',
          address: address ?? shellId,
          isShell: true,
        })
      }
    }

    return {
      rows,
      shellId,
      characters: directory.data,
      isLoading: directory.isLoading,
    }
  }, [entity, entityOwner, directory.data, directory.isLoading])
}
