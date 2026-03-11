import React, { useEffect, useState } from "react";

import {
  AssemblyType,
  Assemblies,
  State,
  abbreviateAddress,
  isOwner,
  RawSuiObjectData,
  parseStatus,
} from "@evefrontier/dapp-kit";
import { ButtonCorner, CopyIcon } from "../assets";
import ClickToCopy from "../components/ClickToCopy";

interface GateInfoProps {
  linked?: AssemblyType<Assemblies.SmartGate>;
  destinationGate?: RawSuiObjectData;
}

interface GateCardProps {
  isLinked: boolean;
  isOwner: boolean;
  /**
   * @deprecated No longer used; selection is handled by the parent. Will be removed in a future version.
   */
  isSelected?: boolean;
  /**
   * @deprecated No longer used; selection is handled by the parent. Will be removed in a future version.
   */
  onSelect?: () => void; // Deprecated
  gate?: AssemblyType<Assemblies.SmartGate>;
  parentGate: AssemblyType<Assemblies.SmartGate>;
  destinationGate?: RawSuiObjectData;
}

const GateInfo: React.FC<GateInfoProps> = ({ linked, destinationGate }) => {
  if (!destinationGate) return <></>;

  const { id, key, linked_gate_id, metadata, type_id, status } =
    destinationGate;

  const { name, description, url } = metadata ?? {};

  const state = parseStatus(status?.status?.["@variant"]);

  const renderInfoMessage = () => {
    // If gate is linked to another gate, show the name of the linked gate
    if (linked) {
      return "Linked to " + (linked.name || abbreviateAddress(linked?.id));
    } else if (state === State.ANCHORED) {
      // If gate is anchored, show "Offline"
      return "Offline";
    }

    // Otherwise, show the type of the gate
    return type_id;
  };

  return (
    <div className="flex flex-col">
      <div className="flex w-full justify-between font-disket text-base text-neutral">
        <span className="flex items-center align-center">
          {name || `${abbreviateAddress(id)}`} <ClickToCopy text={id} />
        </span>
      </div>
      <div className="flex gap-4 font-disket">
        <span className="text-sm">{renderInfoMessage()}</span>
      </div>
    </div>
  );
};

interface ButtonCornersProps {
  color?: string;
}

const ButtonCorners: React.FC<ButtonCornersProps> = ({ color }) => (
  <>
    <ButtonCorner
      className={`absolute -top-[1px] -left-[1px] -rotate-90 button-corner ${color}`}
    />
    <ButtonCorner
      className={`absolute -top-[1px] -right-[1px] button-corner ${color}`}
    />
    <ButtonCorner
      className={`absolute -bottom-[1px] -left-[1px] rotate-180 button-corner ${color}`}
    />
    <ButtonCorner
      className={`absolute -bottom-[1px] -right-[1px] rotate-90 button-corner ${color}`}
    />
  </>
);

const GateCard = React.memo(
  ({ gate, isLinked, isOwner, destinationGate }: GateCardProps) => {
    const [isLinkedElsewhere, setIsLinkedElsewhere] = useState<boolean>(false);
    const [linkedGateInfo, setLinkedGateInfo] = useState<
      AssemblyType<Assemblies.SmartGate> | undefined
    >(undefined);
    const [canBeInteractedWith, setCanBeInteractedWith] =
      useState<boolean>(false);

    useEffect(() => {
      /** Check if user is owner of given gate
       * Then check if gate is online
       * If both are true, gate can be interacted with
       */

      if (!gate) return;

      if (isOwner && gate.state === State.ONLINE) {
        setCanBeInteractedWith(true);
      }
    }, [gate]);

    const baseClasses =
      "relative flex justify-between w-full border bg-neutral-5 hover:bg-neutral-10";
    const borderClasses = isLinked
      ? "border-martianred-10"
      : "border-neutral-10";
    const disabledClasses =
      isLinkedElsewhere || !canBeInteractedWith
        ? "opacity-50 !hover:bg-neutral-5"
        : "";
    const innerBorderClasses =
      "flex w-full font-disket text-base text-neutral-60 justify-center border border-martianred-30 p-4";

    /** If there is no gate, show a placeholder for a gate in range */
    if (!destinationGate) {
      return (
        <div className={`${baseClasses} border-martianred-10 p-1`}>
          <div className={innerBorderClasses}>No gate linked</div>
          <ButtonCorners color="text-martianred" />
        </div>
      );
    } else {
      /** If there is a gate linked, show special UI for it */
      return (
        <div className={`${baseClasses} ${borderClasses} p-1`}>
          <div className={innerBorderClasses}>
            <div className={`${baseClasses} border-neutral-10 p-4`}>
              <GateInfo
                linked={linkedGateInfo}
                destinationGate={destinationGate}
              />
            </div>
          </div>
          <ButtonCorners color="text-martianred" />
        </div>
      );
    }
  },
);

export default GateCard;
