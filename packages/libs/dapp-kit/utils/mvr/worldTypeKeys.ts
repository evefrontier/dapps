/**
 * Canonical EVE World Move types the dapp interpolates into GraphQL/gRPC
 * `type:` filters and event subscriptions, plus the literal MVR type names that
 * seed `@mysten/mvr-static` generation.
 *
 * Each Move type is pinned to the package version in which it was FIRST defined
 * (its type-origin), which differs per type and is NOT the latest upgrade nor
 * necessarily version 1. A single world package id therefore cannot be
 * interpolated into every type string; each type must be resolved individually.
 * `mvrCache.generated.ts` embeds those resolutions; regenerate it with
 * `bun run gen:mvr` after any world-contract upgrade.
 */

/** Short `module::Type` keys, the single source of truth for what we resolve. */
export const WORLD_TYPE_KEYS = [
  'character::Character',
  'character::PlayerProfile',
  'access::OwnerCap',
  'object_registry::ObjectRegistry',
  'energy::EnergyConfig',
  'fuel::FuelConfig',
  'in_game_id::TenantItemId',
  'inventory::ItemBurnedEvent',
  'inventory::ItemMintedEvent',
  'status::StatusChangedEvent',
  'fuel::FuelEvent',
] as const

export type WorldTypeKey = (typeof WORLD_TYPE_KEYS)[number]

/**
 * Fully-qualified MVR type-name literals across every world tier. Only exists so
 * the `@mysten/mvr-static` scanner (which matches literal `name::module::Type`
 * strings, not our dynamically-built ones) discovers what to resolve. Not read
 * at runtime — the generated cache is. Keep in sync with {@link WORLD_TYPE_KEYS}.
 */
export const MVR_SCAN_SEED = [
  '@evefrontier/world::character::Character',
  '@evefrontier/world::character::PlayerProfile',
  '@evefrontier/world::access::OwnerCap',
  '@evefrontier/world::object_registry::ObjectRegistry',
  '@evefrontier/world::energy::EnergyConfig',
  '@evefrontier/world::fuel::FuelConfig',
  '@evefrontier/world::in_game_id::TenantItemId',
  '@evefrontier/world::inventory::ItemBurnedEvent',
  '@evefrontier/world::inventory::ItemMintedEvent',
  '@evefrontier/world::status::StatusChangedEvent',
  '@evefrontier/world::fuel::FuelEvent',
  '@evefrontier/world-dev::character::Character',
  '@evefrontier/world-dev::character::PlayerProfile',
  '@evefrontier/world-dev::access::OwnerCap',
  '@evefrontier/world-dev::object_registry::ObjectRegistry',
  '@evefrontier/world-dev::energy::EnergyConfig',
  '@evefrontier/world-dev::fuel::FuelConfig',
  '@evefrontier/world-dev::in_game_id::TenantItemId',
  '@evefrontier/world-dev::inventory::ItemBurnedEvent',
  '@evefrontier/world-dev::inventory::ItemMintedEvent',
  '@evefrontier/world-dev::status::StatusChangedEvent',
  '@evefrontier/world-dev::fuel::FuelEvent',
  '@evefrontier/world-test::character::Character',
  '@evefrontier/world-test::character::PlayerProfile',
  '@evefrontier/world-test::access::OwnerCap',
  '@evefrontier/world-test::object_registry::ObjectRegistry',
  '@evefrontier/world-test::energy::EnergyConfig',
  '@evefrontier/world-test::fuel::FuelConfig',
  '@evefrontier/world-test::in_game_id::TenantItemId',
  '@evefrontier/world-test::inventory::ItemBurnedEvent',
  '@evefrontier/world-test::inventory::ItemMintedEvent',
  '@evefrontier/world-test::status::StatusChangedEvent',
  '@evefrontier/world-test::fuel::FuelEvent',
  '@evefrontier/world-uat::character::Character',
  '@evefrontier/world-uat::character::PlayerProfile',
  '@evefrontier/world-uat::access::OwnerCap',
  '@evefrontier/world-uat::object_registry::ObjectRegistry',
  '@evefrontier/world-uat::energy::EnergyConfig',
  '@evefrontier/world-uat::fuel::FuelConfig',
  '@evefrontier/world-uat::in_game_id::TenantItemId',
  '@evefrontier/world-uat::inventory::ItemBurnedEvent',
  '@evefrontier/world-uat::inventory::ItemMintedEvent',
  '@evefrontier/world-uat::status::StatusChangedEvent',
  '@evefrontier/world-uat::fuel::FuelEvent',
] as const
