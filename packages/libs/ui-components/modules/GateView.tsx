import { Assemblies, AssemblyType, isOwner } from "@evefrontier/dapp-kit";
import React, { useEffect, useState } from "react";
import EveScroll from "../components/EveScroll";
import GateCard from "./GateCard";
import Offline from "./Offline";

interface GateViewProps {
  assembly: AssemblyType<Assemblies.SmartGate>;
  viewerAddress: `0x${string}`; // Used to check if gate is owned by viewer
}

const GateView = React.memo(
  ({ assembly, viewerAddress }: GateViewProps): React.JSX.Element => {
    const [isViewerOwner, setIsViewerOwner] = useState<boolean>(false);

    useEffect(() => {
      /** Check if gate is owned by viewer
       * If not, hide linking and unlinking buttons
       */
      setIsViewerOwner(isOwner(assembly, viewerAddress));
    }, [assembly, viewerAddress]);

    if (!assembly) return <></>;

    const { destinationId } = assembly.gate;

    return assembly.state === "online" ? (
      <div className="row-span-3" id="smartassembly-gate">
        <EveScroll
          maxHeight="750px"
          classStyles="Border-Container !border-0 flex flex-col gap-2"
        >
          <div className="flex flex-col gap-4 min-h-full">
            <div className="flex flex-col gap-2 min-h-full">
              <div className="text-xs font-disket">Linked gate</div>
              {destinationId ? (
                <GateCard
                  isOwner={isViewerOwner}
                  isLinked={true}
                  parentGate={assembly}
                  destinationGate={assembly.gate.destinationGate ?? undefined}
                />
              ) : (
                <GateCard
                  isOwner={isViewerOwner}
                  isLinked={false}
                  parentGate={assembly}
                />
              )}
            </div>
          </div>
        </EveScroll>
      </div>
    ) : (
      <Offline isParentNodeOnline={assembly.isParentNodeOnline ?? false} />
    );
  },
);

export default GateView;
