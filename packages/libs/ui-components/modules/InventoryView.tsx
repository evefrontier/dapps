import {
  Assemblies,
  AssemblyType,
  DatahubGameInfo,
  findOwnerByAddress,
  formatM3,
  getDatahubGameInfo,
  type InventoryItem,
  isOwner,
} from '@evefrontier/dapp-kit'
import React, { useEffect, useMemo, useState } from 'react'
import EveLinearBar from '../components/EveLinearBar'
import {
  DigitalChemistryItemRow,
  getDatahubTypeId,
  isDigitalChemistryItem,
  unpackTypeId,
} from './InventoryView.DigitalChemistry'
import Offline from './Offline'

const InventoryView = React.memo(
  ({
    assembly,
    currentAddress,
  }: {
    assembly: AssemblyType<Assemblies.SmartStorageUnit>
    currentAddress: `0x${string}`
  }): React.JSX.Element => {
    const [itemDetailsMap, setItemDetailsMap] = useState<
      Map<number, DatahubGameInfo>
    >(new Map())

    const inventoryItems = useMemo((): InventoryItem[] | undefined => {
      if (!assembly) return undefined
      const { mainInventory, ephemeralInventories } = assembly.storage
      const entityOwner = isOwner(assembly, currentAddress)
      const playerInventory = ephemeralInventories.find((x) =>
        findOwnerByAddress(x.ownerId, currentAddress),
      )
      // If owner, return persistent storage items
      // If player, return own ephemeral storage items
      return entityOwner
        ? mainInventory?.items?.map((item: any) => item)
        : playerInventory?.ephemeralInventoryItems?.map((item) => item)
    }, [assembly, currentAddress])

    // Stable primitive: only changes when the set of type_ids changes.
    const typeIdsKey = useMemo(() => {
      if (!inventoryItems?.length) return ''
      return [
        ...new Set(
          inventoryItems.map((item) => getDatahubTypeId(item.type_id)),
        ),
      ]
        .sort((a, b) => a - b)
        .join(',')
    }, [inventoryItems])

    // Batch fetch all unique type_ids in parallel when inventory contents change.
    useEffect(() => {
      if (!typeIdsKey) {
        setItemDetailsMap(new Map())
        return
      }
      const uniqueTypeIds = typeIdsKey.split(',').map(Number)
      let cancelled = false
      Promise.all(
        uniqueTypeIds.map((typeId) =>
          getDatahubGameInfo(typeId).then((info) => [typeId, info] as const),
        ),
      ).then((results) => {
        if (!cancelled) {
          setItemDetailsMap(new Map(results))
        }
      })
      return () => {
        cancelled = true
      }
    }, [typeIdsKey])

    if (!assembly) return <></>

    const { mainInventory, ephemeralInventories } = assembly.storage

    const isEntityOwner: boolean = isOwner(assembly, currentAddress)

    const playerInventory = ephemeralInventories.find((x) =>
      findOwnerByAddress(x.ownerId, currentAddress),
    )

    const storageCap = isEntityOwner
      ? mainInventory?.capacity
      : playerInventory?.storageCapacity || mainInventory?.capacity // Fallback to main inventory capacity if player inventory is undefined
    const usedCap = isEntityOwner
      ? mainInventory?.usedCapacity
      : playerInventory?.usedCapacity

    return (
      <>
        {assembly.state === 'online' ? (
          <div className="text-xs flex flex-col p-4! gap-2 min-h-full">
            <div className="flex flex-col w-full">
              <div
                className="grid w-full font-disket text-xs text-neutral-50"
                style={{ gridTemplateColumns: '60% 20% 20%' }}
              >
                <span>Name</span>
                <span>Amount</span>
                <span>ID</span>
              </div>
            </div>

            <div
              className="grid w-full text-neutral text-sm overflow-y-scroll"
              style={{
                gridTemplateColumns: '60% 20% 20%',
                lineHeight: '1.15rem',
              }}
            >
              {!inventoryItems || inventoryItems.length === 0 ? (
                <div className="text-neutral text-sm">Empty</div>
              ) : (
                inventoryItems?.map((item) => (
                  <InventoryItemRow
                    item={item}
                    details={itemDetailsMap.get(getDatahubTypeId(item.type_id))}
                    key={item.id}
                  />
                ))
              )}
            </div>

            <EveLinearBar
              nominator={formatM3(usedCap ?? '0')}
              denominator={formatM3(storageCap ?? '0')}
              label="m3"
              wholeNumbers
            />
          </div>
        ) : (
          <Offline isParentNodeOnline={assembly.isParentNodeOnline ?? false} />
        )}
      </>
    )
  },
)

const InventoryItemRow = ({
  item,
  details,
}: {
  item: InventoryItem
  details?: DatahubGameInfo
}) => {
  const { quantity, type_id } = item

  if (isDigitalChemistryItem(type_id)) {
    return <DigitalChemistryItemRow item={item} details={details} />
  }

  const { typeId } = unpackTypeId(type_id)

  return (
    <>
      <span>{details?.name ?? `Item Type ${typeId}`}</span>
      <span>{quantity}</span>
      <span>{typeId}</span>
    </>
  )
}

export default InventoryView
