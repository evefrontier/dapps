import React, { useEffect, useState } from "react";

import {
  AssemblyType,
  Assemblies,
  type InventoryItem,
  findOwnerByAddress,
  formatM3,
  isOwner,
  getDatahubGameInfo,
  DatahubGameInfo,
} from "@evefrontier/dapp-kit";
import EveLinearBar from "../components/EveLinearBar";
import Offline from "./Offline";

const InventoryView = React.memo(
  ({
    assembly,
    currentAddress,
  }: {
    assembly: AssemblyType<Assemblies.SmartStorageUnit>;
    currentAddress: `0x${string}`;
  }): React.JSX.Element => {
    const [itemDetailsMap, setItemDetailsMap] = useState<
      Map<number, DatahubGameInfo>
    >(new Map());

    if (!assembly) return <></>;

    const { mainInventory, ephemeralInventories } = assembly.storage;

    const isEntityOwner: boolean = isOwner(assembly, currentAddress);

    const playerInventory = ephemeralInventories.find((x) =>
      findOwnerByAddress(x.ownerId, currentAddress),
    );

    // If owner, return persistent storage items
    // If player, return own ephemeral storage items
    const inventoryItems = isEntityOwner
      ? mainInventory?.items?.map((item: any) => {
          return item;
        })
      : playerInventory?.ephemeralInventoryItems?.map((item) => {
          return item;
        });

    const storageCap = isEntityOwner
      ? mainInventory?.capacity
      : playerInventory?.storageCapacity || mainInventory?.capacity; // Fallback to main inventory capacity if player inventory is undefined
    const usedCap = isEntityOwner
      ? mainInventory?.usedCapacity
      : playerInventory?.usedCapacity;

    // Batch fetch all unique type_ids in parallel
    useEffect(() => {
      if (!inventoryItems || inventoryItems.length === 0) return;

      // Get unique type_ids
      const uniqueTypeIds = [
        ...new Set(inventoryItems.map((item: InventoryItem) => item.type_id)),
      ];

      // Fetch all in parallel (getDatahubGameInfo has internal caching)
      Promise.all(
        uniqueTypeIds.map((typeId) =>
          getDatahubGameInfo(typeId).then((info) => [typeId, info] as const),
        ),
      ).then((results) => {
        setItemDetailsMap(new Map(results));
      });
    }, [inventoryItems]);

    return (
      <>
        {assembly.state === "online" ? (
          <div className="text-xs flex flex-col !p-4 gap-2 min-h-full">
            <div className="flex flex-col w-full">
              <div
                className="grid w-full font-disket text-xs text-neutral-50"
                style={{ gridTemplateColumns: "60% 20% 20%" }}
              >
                <span>Name</span>
                <span>Amount</span>
                <span>ID</span>
              </div>
            </div>

            <div
              className="grid w-full text-neutral text-sm overflow-y-scroll"
              style={{
                gridTemplateColumns: "60% 20% 20%",
                lineHeight: "1.15rem",
              }}
            >
              {!inventoryItems || inventoryItems.length === 0 ? (
                <div className="text-neutral text-sm">Empty</div>
              ) : (
                inventoryItems?.map((item, index) => (
                  <InventoryItemRow
                    item={item}
                    details={itemDetailsMap.get(item.type_id)}
                    key={index}
                  />
                ))
              )}
            </div>

            <EveLinearBar
              nominator={formatM3(usedCap ?? "0")}
              denominator={formatM3(storageCap ?? "0")}
              label={`m3`}
            />
          </div>
        ) : (
          <Offline isParentNodeOnline={assembly.isParentNodeOnline ?? false} />
        )}
      </>
    );
  },
);

const InventoryItemRow = ({
  item,
  details,
}: {
  item: InventoryItem;
  details?: DatahubGameInfo;
}) => {
  const { quantity, type_id } = item;

  return (
    <>
      <span>{details?.name ?? `Item Type ${type_id}`}</span>
      <span>{quantity}</span>
      <span>{type_id}</span>
    </>
  );
};

export default InventoryView;
