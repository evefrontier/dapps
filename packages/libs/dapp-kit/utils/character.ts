import type { CharacterInfo, RawCharacterData } from "../graphql/types";
import type {
  CharacterJsonKey,
  CharacterJsonMetadata,
  LooseCharacterJson,
} from "../types/character";

function isPlainCharacterJson(value: unknown): value is LooseCharacterJson {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalInt(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Normalize raw character JSON (from wallet/assembly GQL responses) into CharacterInfo.
 * Accepts varying shapes; returns null when input is not a usable object.
 *
 * @param json - Raw JSON (e.g. from contents.json or extract...contents.json)
 * @returns CharacterInfo or null
 * @category Character Helpers
 */
export function parseCharacterFromJson(json: unknown): CharacterInfo | null {
  if (!isPlainCharacterJson(json)) {
    return null;
  }

  const metadataValue = json.metadata;
  const metadata =
    metadataValue != null &&
    typeof metadataValue === "object" &&
    !Array.isArray(metadataValue)
      ? (metadataValue as CharacterJsonMetadata)
      : undefined;

  const keyValue = json.key;
  const key =
    keyValue != null && typeof keyValue === "object" && !Array.isArray(keyValue)
      ? (keyValue as CharacterJsonKey)
      : undefined;

  return {
    id: typeof json.id === "string" ? json.id : "",
    address:
      typeof json.character_address === "string" ? json.character_address : "",
    name: typeof metadata?.name === "string" ? metadata.name : "",
    tribeId: parseOptionalInt(json.tribe_id),
    characterId: parseOptionalInt(key?.item_id),
    _raw: json as RawCharacterData,
  };
}
