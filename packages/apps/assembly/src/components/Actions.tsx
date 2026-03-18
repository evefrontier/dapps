import React from "react";

import {
  useSmartObject,
  useConnection,
  ActionTypes,
  State,
  AssemblyType,
  Assemblies,
  isOwner,
  useSponsoredTransaction,
  Severity,
  useNotification,
} from "@evefrontier/dapp-kit";
import { EveButton } from "@eveworld/ui-components";

import { bringOffline } from "../functions/bringOffline";
import { bringOnline } from "../functions/bringOnline";

/**
 * Handles actions for a smart storage unit, such as editing unit details, bringing online/offline, and accessing dApp link.
 *
 * Renders buttons for editing unit details, bringing the unit online/offline, and accessing the dApp link.
 *
 * @returns React.JSX.Element
 */
const Actions = React.memo(
  ({
    setIsEditing,
    isOnline,
  }: {
    setIsEditing: (isEditing: boolean) => void;
    isOnline: boolean;
  }) => {
    const { assembly, refetch } = useSmartObject();
    const { currentAccount } = useConnection();
    const { notify } = useNotification();
    const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction();

    if (assembly === undefined || assembly === null) return <></>;

    const isEntityOwner: boolean = isOwner(assembly, currentAccount?.address);

    // If parent node is online, linked assembly can be brought online
    const canBringOnline: boolean = (() => {
      const getParentNodeStatus = (
        assembly: AssemblyType<Assemblies>,
      ): boolean => {
        switch (assembly.type) {
          case Assemblies.SmartStorageUnit: {
            const storageAssembly =
              assembly as AssemblyType<Assemblies.SmartStorageUnit>;
            return storageAssembly.isParentNodeOnline ?? false;
          }
          case Assemblies.SmartTurret: {
            const turretAssembly =
              assembly as AssemblyType<Assemblies.SmartTurret>;
            return turretAssembly.isParentNodeOnline ?? false;
          }
          case Assemblies.SmartGate: {
            const gateAssembly = assembly as AssemblyType<Assemblies.SmartGate>;
            return gateAssembly.isParentNodeOnline ?? false;
          }
          case Assemblies.Manufacturing: {
            const manufacturingAssembly =
              assembly as AssemblyType<Assemblies.Manufacturing>;
            return manufacturingAssembly.isParentNodeOnline ?? false;
          }
          case Assemblies.Refinery: {
            const refineryAssembly =
              assembly as AssemblyType<Assemblies.Refinery>;
            return refineryAssembly.isParentNodeOnline ?? false;
          }
          case Assemblies.NetworkNode: {
            const networkAssembly =
              assembly as AssemblyType<Assemblies.NetworkNode>;
            // If already online, can always bring offline
            // If offline, can only bring online if there is fuel
            return (
              networkAssembly.state === State.ONLINE ||
              Number(networkAssembly.networkNode.fuel.quantity) > 0
            );
          }
          case Assemblies.Assembly: {
            const baseAssembly = assembly as AssemblyType<Assemblies.Assembly>;
            return baseAssembly.isParentNodeOnline ?? false;
          }
          default:
            return true;
        }
      };

      return getParentNodeStatus(assembly) ?? false;
    })();

    // If smart assembly is online, user is allowed to bring offline
    const handleAction = async (action: ActionTypes) => {
      try {
        if (action === ActionTypes.BRING_ONLINE) {
          const result = await bringOnline({
            assembly,
            sendSponsoredTransaction,
          });

          console.log("bringOnline result", result);
          if (result?.digest) {
            notify({
              type: Severity.Success,
              txHash: result.digest,
              onSuccess: async () => {
                await refetch();
              },
            });
          }
        } else {
          const result = await bringOffline({
            assembly,
            sendSponsoredTransaction,
          });

          console.log("bringOffline result", result);
          if (result?.digest) {
            notify({
              type: Severity.Success,
              txHash: result.digest,
              onSuccess: async () => {
                await refetch();
              },
            });
          }
        }
      } catch (error) {
        notify({
          type: Severity.Error,
          message: `Failed to bring ${action}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    };

    const handleEditAction = () => {
      setIsEditing(true);
    };

    return (
      <div className="grid grid-cols-2 gap-2" id="SmartObject-Actions">
        <>
          {assembly.type !== Assemblies.NetworkNode && (
            <EveButton
              variant="secondary"
              cooldown={3000}
              isCta={!isOnline}
              size="md"
              onClick={() =>
                handleAction(
                  isOnline
                    ? ActionTypes.BRING_OFFLINE
                    : ActionTypes.BRING_ONLINE,
                )
              }
              disabled={!isEntityOwner || !canBringOnline}
              id="bring-online-offline"
            >
              {assembly.state !== State.ONLINE
                ? ActionTypes.BRING_ONLINE
                : ActionTypes.BRING_OFFLINE}
            </EveButton>
          )}
          <EveButton
            variant="secondary"
            size="md"
            onClick={handleEditAction}
            disabled={!isEntityOwner}
            id="edit-unit"
            className={`${assembly.type === Assemblies.NetworkNode ? "col-span-2" : ""}`}
          >
            Edit assembly
          </EveButton>
        </>
      </div>
    );
  },
);

export default React.memo(Actions);
