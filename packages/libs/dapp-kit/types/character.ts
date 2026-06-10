/** Nested `metadata` fields we read when present. */
type CharacterJsonMetadata = {
  name?: unknown
}

/** Nested `key` fields we read when present. */
type CharacterJsonKey = {
  item_id?: unknown
}

/**
 * Top-level JSON shape from wallet/assembly responses (all keys optional).
 * No index signature — enables dot access under `noPropertyAccessFromIndexSignature`.
 */
type LooseCharacterJson = {
  id?: unknown
  character_address?: unknown
  metadata?: unknown
  key?: unknown
  tribe_id?: unknown
}

export type { CharacterJsonKey, CharacterJsonMetadata, LooseCharacterJson }
