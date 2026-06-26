import { decodeFuelEventBcsToJson } from './fuelEventBcs'
import { decodeInventoryEventBcsToJson } from './inventoryEventBcs'
import { decodeStatusChangedEventBcsToJson } from './statusEventBcs'

type BcsDecoder = (bytes: Uint8Array) => Record<string, unknown>

const DECODERS_BY_SUFFIX: ReadonlyArray<[suffix: string, decode: BcsDecoder]> =
  [
    ['::inventory::ItemMintedEvent', decodeInventoryEventBcsToJson],
    ['::inventory::ItemBurnedEvent', decodeInventoryEventBcsToJson],
    ['::fuel::FuelEvent', decodeFuelEventBcsToJson],
    ['::status::StatusChangedEvent', decodeStatusChangedEventBcsToJson],
  ]

export function decodeEventBcsToJson(
  bytes: Uint8Array,
  eventType: string,
): Record<string, unknown> | null {
  const entry = DECODERS_BY_SUFFIX.find(([suffix]) =>
    eventType.endsWith(suffix),
  )
  if (!entry) return null
  try {
    return entry[1](bytes)
  } catch {
    return null
  }
}
