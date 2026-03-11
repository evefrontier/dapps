import React, { useState } from "react";
import { useLocation } from "react-router-dom";

import {
  useNotification,
  useSmartObject,
  Assemblies,
  AssemblyType,
  getDappUrl,
} from "@evefrontier/dapp-kit";
import {
  InventoryView,
  GateView,
  EveContainer,
  EveButton,
  TurretView,
  Graph,
} from "@eveworld/ui-components";

import { useCurrentAccount } from "@mysten/dapp-kit-react";

interface DappIframeProps {
  assembly: AssemblyType<Assemblies>;
}

const DappIframe: React.FC<DappIframeProps> = ({ assembly }) => (
  <div className="flex flex-col gap-4">
    <iframe
      src={getDappUrl(assembly)}
      id="dapp-iframe"
      title="Operation Config"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      className="w-full min-h-[520px] grow"
      allowFullScreen
    />
    <EveButton
      variant="secondary"
      onClick={() => {
        window.open(getDappUrl(assembly), "_blank");
      }}
    >
      Open in new tab
    </EveButton>
  </div>
);

interface ModuleRendererProps {
  assembly: AssemblyType<Assemblies>;
  currentAddress: `0x${string}`;
  notify: any;
  selectedSmartGate: string | undefined;
  setSelectedSmartGate: (id: string) => void;
  showContainer: boolean;
}

const ModuleRenderer: React.FC<ModuleRendererProps> = ({
  assembly,
  currentAddress,
  setSelectedSmartGate,
  showContainer = true,
}) => {
  const isNetworkNode = assembly.type === Assemblies.NetworkNode;
  const hasDappUrl = assembly.dappURL && !isNetworkNode;

  const getContainerVariant = () => {
    if (hasDappUrl) return "warning" as const;
    return "default" as const;
  };

  const getContainerProps = () => ({
    className: "flex flex-col min-h-full",
    id: "Eve-Assembly-Module",
    variant: getContainerVariant(),
    showBorder: showContainer,
    showHeader: showContainer,
    ...(hasDappUrl && {
      statusTextTop: "BEHAVIOR",
      statusTextBottom:
        "ATT. Pilot, you are interacting with an interface outside of Frontier.",
    }),
  });

  const renderModule = () => {
    const result = (() => {
      switch (assembly.type) {
        case "SmartStorageUnit":
          return {
            component: (
              <InventoryView
                assembly={assembly as AssemblyType<Assemblies.SmartStorageUnit>}
                currentAddress={currentAddress}
              />
            ),
            headerText: "STORAGE",
          };
        case "SmartGate":
          return {
            component: (
              <GateView
                assembly={assembly as AssemblyType<Assemblies.SmartGate>}
                viewerAddress={currentAddress}
              />
            ),
            headerText: "GATE",
          };
        case Assemblies.SmartTurret:
          return {
            component: (
              <TurretView
                assembly={assembly as AssemblyType<Assemblies.SmartTurret>}
              />
            ),
            headerText: "TURRET",
          };
        case Assemblies.NetworkNode:
          return {
            component: (
              <Graph
                width={712}
                height={500}
                assembly={assembly as AssemblyType<Assemblies.NetworkNode>}
              />
            ),
            headerText: "GENERATOR",
          };
        default:
          return {
            component: <></>,
            headerText: "",
          };
      }
    })();

    return result;
  };

  const { component, headerText } = renderModule();
  return (
    <EveContainer {...getContainerProps()} headerText={headerText}>
      {hasDappUrl ? <DappIframe assembly={assembly} /> : component}
    </EveContainer>
  );
};

const Behaviour = React.memo((): React.JSX.Element => {
  const [selectedSmartGate, setSelectedSmartGate] = useState<
    string | undefined
  >(undefined);
  const { assembly } = useSmartObject();
  const currentAccount = useCurrentAccount();
  const { notify } = useNotification();
  const showContainer = !useLocation().pathname.includes("client");

  if (!assembly || !currentAccount) {
    return <div className="Eve-Module" />;
  }

  const isRefineryOrManufacturing =
    assembly.type === Assemblies.Refinery ||
    assembly.type === Assemblies.Manufacturing;

  if (isRefineryOrManufacturing) {
    return <div className="Eve-Module" />;
  }

  return (
    <ModuleRenderer
      assembly={assembly}
      currentAddress={currentAccount?.address as `0x${string}`}
      notify={notify}
      selectedSmartGate={selectedSmartGate}
      setSelectedSmartGate={setSelectedSmartGate}
      showContainer={showContainer}
    />
  );
});

export default Behaviour;
