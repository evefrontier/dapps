import { type DatahubGameInfo, type InventoryItem } from '@evefrontier/dapp-kit'

const TYPE_ID_BITS = 32n
const TYPE_ID_MASK = 0xffffffffn

// Packed type_id: upper 32 bits are the variant id, lower 32 bits the real type id.
// Plain type_ids (nothing in the upper 32 bits) unpack to the type id itself, variant 0.
export const unpackTypeId = (packedTypeId: InventoryItem['type_id']) => {
  const packed = BigInt(packedTypeId)
  return {
    typeId: packed & TYPE_ID_MASK,
    variantId: packed >> TYPE_ID_BITS,
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
