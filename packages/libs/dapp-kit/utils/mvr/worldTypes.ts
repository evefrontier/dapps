import type { SuiGraphqlNetwork } from '../../types'
import {
  DEFAULT_GRAPHQL_NETWORK,
  getEveWorldPackageRef,
  HEX_ADDRESS,
} from '../constants'
import { getMvrCache } from './mvrCache.generated'
import type { WorldTypeKey } from './worldTypeKeys'

/**
 * A Move type's identity is pinned to the package version in which the type was
 * first defined (its type-origin). On-chain object/event type tags always carry
 * that origin id, so `type:` filters and event subscriptions must use it.
 * Each type is resolved individually against the embedded {@link getMvrCache}
 * snapshot.
 *
 * @see worldTypeKeys.ts for how the snapshot is generated/regenerated.
 */

/** `@mysten/mvr-static` only distinguishes mainnet vs testnet. */
const mvrNetwork = (network: SuiGraphqlNetwork): 'mainnet' | 'testnet' =>
  network === 'mainnet' ? 'mainnet' : 'testnet'

/**
 * The generated `getMvrCache` types its `packages`/`types` as empty object
 * literals (mvr-static emits untyped consts and the mainnet maps are `{}`), so
 * index access needs a record view. Shape is stable across regeneration.
 */
const worldMvrCache = (
  network: SuiGraphqlNetwork,
): { packages: Record<string, string>; types: Record<string, string> } =>
  getMvrCache(mvrNetwork(network)) as {
    packages: Record<string, string>
    types: Record<string, string>
  }

/**
 * The `@evefrontier/world*` MVR names are currently only registered on testnet;
 * the mainnet snapshot maps are empty. When resolution is attempted on a network
 * with no entries, surface that clearly instead of a "regenerate the cache"
 * message — regenerating cannot help until the names exist on that network. This
 * is data-driven, so it stops firing automatically once the snapshot has entries
 * for the network.
 */
const unsupportedNetworkMessage = (network: SuiGraphqlNetwork): string =>
  `World MVR names are not resolvable on "${mvrNetwork(network)}": the embedded ` +
  `snapshot has no entries for it (the @evefrontier/world* names are not ` +
  `registered on ${mvrNetwork(network)}). Use testnet, or set ` +
  `VITE_EVE_WORLD_PACKAGE_ID to a raw 0x address.`

/**
 * Resolve a world Move type to its fully-qualified, type-origin-correct tag.
 *
 * - A raw `0x…` env value is treated as already-canonical and interpolated
 *   verbatim (`${addr}::${key}`), preserving legacy single-package behavior.
 * - An MVR name (`@evefrontier/world-<tier>`) is looked up in the embedded
 *   resolution snapshot. A missing entry throws — it means the snapshot is stale
 *   (a new type/tier was added without regenerating) rather than silently
 *   building a filter that matches nothing.
 *
 * @param key - Short `module::Type` key (see {@link WorldTypeKey})
 * @param network - Network to resolve against. Defaults to the app default.
 * @returns The fully-qualified type tag, e.g. `0x…::character::Character`
 * @throws If the env var is unset, or an MVR name has no snapshot entry
 * @category Utilities - Config
 */
export const getWorldType = (
  key: WorldTypeKey,
  network: SuiGraphqlNetwork = DEFAULT_GRAPHQL_NETWORK,
): string => {
  const raw = getEveWorldPackageRef()
  const name = `${raw}::${key}`
  // A raw 0x env is already canonical — interpolate verbatim.
  if (HEX_ADDRESS.test(raw)) return name

  const { types } = worldMvrCache(network)
  const tag = types[name]
  if (!tag) {
    if (Object.keys(types).length === 0) {
      throw new Error(unsupportedNetworkMessage(network))
    }
    throw new Error(
      `No MVR resolution for "${name}". The embedded cache is stale or missing ` +
        `this type/tier — regenerate it with \`bun run gen:mvr\` after adding the ` +
        `key to utils/mvr/worldTypeKeys.ts.`,
    )
  }
  return tag
}

/**
 * The world's LATEST package id — for callers that need a package address rather
 * than a type tag (e.g. deriving object ids from a tenant registry, or the
 * legacy `getEveWorldPackageId` consumers). NOTE: this is the latest upgrade, so
 * it is correct for `moveCall` targets but MUST NOT be interpolated into a
 * `type:` filter — use {@link getWorldType} for those.
 *
 * A raw `0x…` env value is returned verbatim; an MVR name is mapped to its
 * latest package id from the embedded snapshot.
 *
 * @throws If the env var is unset, or an MVR name has no snapshot entry
 * @category Utilities - Config
 */
export const getEveWorldPackageId = (
  network: SuiGraphqlNetwork = DEFAULT_GRAPHQL_NETWORK,
): string => {
  const raw = getEveWorldPackageRef()
  if (HEX_ADDRESS.test(raw)) return raw

  const { packages } = worldMvrCache(network)
  const id = packages[raw]
  if (!id) {
    if (Object.keys(packages).length === 0) {
      throw new Error(unsupportedNetworkMessage(network))
    }
    throw new Error(
      `No MVR package resolution for "${raw}". Regenerate the embedded cache ` +
        `with \`bun run gen:mvr\`.`,
    )
  }
  return id
}

/** Type string for Character OwnerCap. Origins of the wrapper and its parameter
 * can differ, so each is resolved separately. @category Utilities - Config */
export const getCharacterOwnerCapType = (): string =>
  `${getWorldType('access::OwnerCap')}<${getWorldType('character::Character')}>`

/** Type string for Character PlayerProfile. @category Utilities - Config */
export const getCharacterPlayerProfileType = (): string =>
  getWorldType('character::PlayerProfile')

/** Type string for ObjectRegistry. @category Utilities - Config */
export const getObjectRegistryType = (): string =>
  getWorldType('object_registry::ObjectRegistry')

/** Type string for EnergyConfig. @category Utilities - Config */
export const getEnergyConfigType = (): string =>
  getWorldType('energy::EnergyConfig')

/** Type string for FuelConfig. @category Utilities - Config */
export const getFuelEfficiencyConfigType = (): string =>
  getWorldType('fuel::FuelConfig')
