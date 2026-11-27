export {
  WORLD_TYPE_KEYS,
  type WorldTypeKey,
} from '@evefrontier/wallet-core/tenant'
export { type AdjustedBurnRate, getAdjustedBurnRate } from './burnRate'
// Characters: the directory from world events, and search over it
export { fetchCharacterDirectory, searchCharacters } from './characters'
// Constants
export * from './constants'
// Datahub utilities
export { getDatahubGameInfo, typeNamesFrom } from './datahub'
// World entity utilities
export {
  fetchEntity,
  fetchEntityOwner,
  isEntity,
  parseEntity,
  type RawEntity,
} from './entity'
export type { ErrorType } from './errors'
// Error handling
export { ERROR_MESSAGES, ERRORS, parseErrorFromMessage } from './errors'
// Power grid: fuel burn (port of power::fuel_math) and display state
export {
  type BurnBreakdown,
  burnBreakdown,
  FUEL_SCALE,
  fromFixed,
  fuelBurn,
  fuelBurnPerHour,
  fuelFactor,
  fuelScale,
  fuelUnit,
  type GeneratorBurnInput,
  type GridProjection,
  generatorBurn,
  generatorOutput,
  msUntilEmpty,
  normalizeFuel,
  normalizeMw,
  POOLS_FUEL_SCALE,
  poolGeneratorBurn,
  powerScale,
  projectedFuel,
  projectGrid,
  sharedBurnImpulse,
  usedMw,
  volatilityShare,
} from './fuel'
export {
  type GeneratorState,
  type GeneratorStatus,
  type GridStatus,
  type GridSummary,
  generatorStates,
  gridSummary,
  type ModuleState,
  type ModuleStatus,
  moduleStates,
  type NoPowerReason,
} from './grid'
// Logging
export * from './logger'
export {
  getObjectId,
  getRegistryAddress,
  parseStatus,
} from './mapping'
// Roles on an entity: shell, controller, visitor
export {
  canManage,
  type DirectoryNeedInput,
  type EntityRole,
  type EntityRoleInput,
  findCharacterByWallet,
  getEntityRole,
  isController,
  isFullAddress,
  type NewControllerResult,
  needsCharacterDirectory,
  resolveNewController,
  sameAddress,
} from './role'
// General utilities
export * from './utils'
