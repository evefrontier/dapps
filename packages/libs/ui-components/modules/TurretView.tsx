import { Assemblies, AssemblyType } from "@evefrontier/dapp-kit";
import React from "react";
import { Hamburger } from "../assets";
import EveRadioGroup from "../components/Radio";

const TurretView = React.memo(
  ({
    assembly,
  }: {
    assembly: AssemblyType<Assemblies.SmartTurret>;
  }): React.JSX.Element => {
    if (!assembly) return <></>;

    return (
      <div className="flex flex-col !p-4 gap-2 min-h-full">
        <div className="text-sm font-disket text-neutral-50 flex gap-2 items-center">
          <Hamburger />
          Target
        </div>
        <div>
          <EveRadioGroup
            options={[
              {
                value: "all",
                label: "All in range",
              },
            ]}
          />
        </div>
      </div>
    );
  },
);

export default TurretView;
