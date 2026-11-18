import { useContext } from 'react'
import { SmartObjectContext } from '../providers/SmartObjectProvider'
import type { SmartObjectContextType } from '../types'

/**
 * Hook for accessing the selected world entity from the Sui GraphQL Indexer.
 *
 * Provides reactive access to the selected entity (its components, layout,
 * power grid, inventories and actions) with polling for updates. The entity is
 * determined from URL query parameters (`?itemId=` and `?tenant=`, derived
 * through the core ObjectRegistry) or from the `VITE_OBJECT_ID` environment
 * variable as a Sui object ID.
 *
 * @category Hooks - Smart Object
 * @returns Object containing entity state and methods:
 *   - `entity` - The parsed entity (or null if not loaded)
 *   - `entityOwner` - Who holds the entity's AccessCap, and their Character (or null)
 *   - `loading` - Boolean indicating if data is being fetched
 *   - `error` - Error message string (or null)
 *   - `refetch` - Function to manually refresh entity data with retries
 *   - `assembly` / `assemblyOwner` - Deprecated, always null
 * @throws {Error} If used outside of `EveFrontierProvider`
 *
 * @example Basic usage
 * ```tsx
 * import { useSmartObject } from '@evefrontier/dapp-kit';
 *
 * const EntityInfo = () => {
 *   const { entity, entityOwner, loading, error, refetch } = useSmartObject();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!entity) return <div>No entity found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{entity.metadata?.name ?? entity.key.id}</h1>
 *       <p>Power: {entity.powerGrid?.on ? 'on' : 'off'}</p>
 *       <p>Owner: {entityOwner?.character?.metadata?.name ?? entityOwner?.walletAddress}</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * };
 * ```
 */
export function useSmartObject(): SmartObjectContextType {
  const context = useContext(SmartObjectContext)
  if (!context) {
    throw new Error('useSmartObject must be used within an EveFrontierProvider')
  }
  return context
}
