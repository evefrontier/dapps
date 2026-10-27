import { type InventoryItem } from '@evefrontier/dapp-kit'

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

export const DigitalChemistryItemRow = ({ item }: { item: InventoryItem }) => {
  const { quantity, type_id } = item
  const { typeId } = unpackTypeId(type_id)

  return (
    <>
      <span>{`Item Type ${typeId} (variant ${unpackTypeId(type_id).variantId})`}</span>
      <span>{quantity}</span>
      <span>{typeId}</span>
    </>
  )
}
