import { useMemo } from 'react'
import {
  type EntityRole,
  findCharacterByWallet,
  getEntityRole,
  needsCharacterDirectory,
} from '../utils/role'
import { useCharacterDirectory } from './useCharacterDirectory'
import { useConnection } from './useConnection'
import { useSmartObject } from './useSmartObject'

/**
 * Hook for the connected wallet's role on the selected entity: `shell`,
 * `controller` or `visitor`. See {@link getEntityRole}.
 *
 * Without `options.characterId`, the wallet's character is looked up in the
 * character directory, which is only fetched when it can change the answer: a
 * wallet is connected, it is not the shell's, and the entity has controllers
 * or its cap is parked on a character. Until it loads, the role reads
 * `visitor` with `isLoading` true.
 *
 * @category Hooks - Access
 * @param options.characterId - The wallet's character id, when the caller knows it
 * @returns
 *   - `role` - The wallet's role
 *   - `characterId` - The wallet's character id, when known
 *   - `isLoading` - True while the directory is loading for this answer
 */
export function useEntityRole(options: { characterId?: string | null } = {}): {
  role: EntityRole
  characterId: string | null
  isLoading: boolean
} {
  const { entity, entityOwner } = useSmartObject()
  const { currentAccount } = useConnection()
  const walletAddress = currentAccount?.address ?? null
  const controllers = entity?.controllers ?? null
  const knownCharacterId = options.characterId ?? null

  const needsDirectory = needsCharacterDirectory({
    walletAddress,
    entityOwner,
    controllers,
    knownCharacterId,
  })
  const directory = useCharacterDirectory({ enabled: needsDirectory })

  return useMemo(() => {
    const characterId =
      knownCharacterId ??
      (needsDirectory
        ? (findCharacterByWallet(directory.data ?? [], walletAddress)
            ?.characterId ?? null)
        : null)
    return {
      role: getEntityRole({
        walletAddress,
        entityOwner,
        controllers,
        characterId,
      }),
      characterId,
      isLoading: needsDirectory && directory.isLoading,
    }
  }, [
    knownCharacterId,
    needsDirectory,
    directory.data,
    directory.isLoading,
    walletAddress,
    entityOwner,
    controllers,
  ])
}
