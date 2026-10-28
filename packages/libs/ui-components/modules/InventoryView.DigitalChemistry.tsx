import { type DatahubGameInfo, type InventoryItem } from '@evefrontier/dapp-kit'

const VARIANT_ID_BITS = 32n
const VARIANT_ID_MASK = 0xffffffffn

// Packed type_id: upper 32 bits are the real type id, lower 32 bits the variant id.
// Plain type_ids (nothing in the upper 32 bits) are the type id itself, variant 0.
export const unpackTypeId = (packedTypeId: InventoryItem['type_id']) => {
  const packed = BigInt(packedTypeId)
  const upper = packed >> VARIANT_ID_BITS

  if (upper === 0n) {
    return { typeId: packed, variantId: 0n }
  }

  return {
    typeId: upper,
    variantId: packed & VARIANT_ID_MASK,
  }
}

// Digital chemistry items carry a non-zero variant id.
export const isDigitalChemistryItem = (typeId: InventoryItem['type_id']) => {
  const { variantId } = unpackTypeId(typeId)
  return variantId !== 0n
}

// The type id Datahub knows the item by.
export const getDatahubTypeId = (typeId: InventoryItem['type_id']) =>
  Number(unpackTypeId(typeId).typeId)

export const DigitalChemistryItemRow = ({
  item,
  details,
}: {
  item: InventoryItem
  details?: DatahubGameInfo
}) => {
  const { quantity, type_id } = item
  const { typeId, variantId } = unpackTypeId(type_id)

  return (
    <>
      <span>{`${details?.name ?? `Item Type ${typeId}`} (variant ${variantId})`}</span>
      <span>{quantity}</span>
      <span>{typeId}</span>
    </>
  )
}
