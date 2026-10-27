import { type DatahubGameInfo, type InventoryItem } from '@evefrontier/dapp-kit'

const DIGITAL_CHEMISTRY_MIN_TYPE_ID_LENGTH = 6
const VARIANT_ID_BITS = 32n
const VARIANT_ID_MASK = 0xffffffffn

// Digital chemistry items use type_ids longer than 5 digits.
export const isDigitalChemistryItem = (typeId: InventoryItem['type_id']) =>
  String(typeId).length >= DIGITAL_CHEMISTRY_MIN_TYPE_ID_LENGTH

// Packed type_id: upper 32 bits are the real type id, lower 32 bits the variant id.
export const unpackTypeId = (packedTypeId: InventoryItem['type_id']) => {
  const packed = BigInt(packedTypeId)

  return {
    typeId: packed >> VARIANT_ID_BITS,
    variantId: packed & VARIANT_ID_MASK,
  }
}

// The type id Datahub knows the item by: unpacked for digital chemistry items.
export const getDatahubTypeId = (typeId: InventoryItem['type_id']) =>
  isDigitalChemistryItem(typeId)
    ? Number(unpackTypeId(typeId).typeId)
    : Number(typeId)

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
