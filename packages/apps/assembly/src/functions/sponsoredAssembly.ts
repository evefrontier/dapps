import {
  Assemblies,
  type AssemblyType,
  type EntityData,
} from '@evefrontier/dapp-kit'

/**
 * The sponsored transaction input still takes the old assembly shape; only
 * `item_id` and `type` are read from it.
 * TODO(wallet-core): pass the entity once sponsored transactions accept one.
 */
export const toSponsoredAssembly = (entity: EntityData) =>
  ({
    item_id: entity.key.id,
    type: Assemblies.Assembly,
  }) as unknown as AssemblyType<Assemblies>
