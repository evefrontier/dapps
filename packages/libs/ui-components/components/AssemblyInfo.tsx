import React, { useEffect, useMemo, useState } from "react";

import {
  abbreviateAddress,
  AssemblyType,
  Assemblies,
  DetailedSmartCharacterResponse,
  isOwner,
  CharacterInfo,
  createLogger,
} from "@evefrontier/dapp-kit";
import EveScroll from "./EveScroll";
import ClickToCopy from "./ClickToCopy";

const log = createLogger();

/**
 * Component that displays information about a smart assembly, including owner, asset ID, type ID, state, and chain.
 * Calculates and displays the fuel amount in m3 using the provided fuel amount, fuel max capacity, and fuel unit volume.
 *
 * @returns React.JSX.Element representing the smart assembly information UI.
 */
const AssemblyInfo = React.memo(
  ({
    assembly,
    assemblyOwner,
    userCharacter,
    styles,
  }: {
    assembly: AssemblyType<Assemblies> | null;
    assemblyOwner: DetailedSmartCharacterResponse | null;
    userCharacter: CharacterInfo | null;
    styles?: string;
  }): React.JSX.Element => {
    if (!assembly) return <></>;

    const isAssemblyOwner = useMemo((): boolean => {
      if (!userCharacter?.address) return false;
      return isOwner(assembly, userCharacter?.address);
    }, [assembly, userCharacter]);

    useEffect(() => {
      if (!isAssemblyOwner) {
        log.warn(
          `[Dapp] AssemblyInfo: Not owner, connected to wallet %s which is ${userCharacter?.id == "0" ? "not a" : "a"} smart character`,
          userCharacter?.address,
        );
      }
    }, [isAssemblyOwner, userCharacter]);

    return (
      <div className={`Entity-About ${styles ? styles : ""}`} id="entity-about">
        <EveScroll
          maxHeight="250px"
          classStyles="grid grid-cols-[2fr_3fr] gap-2 text-sm w-full h-full"
        >
          <SmartAssemblyInfoLine
            title="Owner"
            value={assemblyOwner?.address || ""}
            additionalInfo={`${
              isAssemblyOwner ? "(You)" : ""
            } ${assemblyOwner?.name ? assemblyOwner?.name : ""}`}
            clickToExpand={true}
          />
          <SmartAssemblyInfoLine
            title="Assembly ID"
            value={assembly.id}
            clickToExpand={true}
          />
          <SmartAssemblyInfoLine title="Assembly Type" value={assembly.type} />
          <SmartAssemblyInfoLine
            title="Energy Usage"
            value={`${assembly.energyUsage.toString()} GJ`}
          />
          <SmartAssemblyInfoLine title="State" value={assembly.state} />
        </EveScroll>
      </div>
    );
  },
);

const SmartAssemblyInfoLine = React.memo(
  ({
    title,
    value,
    additionalInfo,
    clickToExpand,
  }: {
    title: string;
    value: string;
    additionalInfo?: string;
    clickToExpand?: boolean;
  }) => {
    return (
      <>
        <span className="self-center">{title}</span>
        <span className="capitalize flex flex-col justify-center overflow-hidden text-right w-full items-end">
          <span className="flex">
            {clickToExpand ? abbreviateAddress(value, 7) : value}{" "}
            {clickToExpand && <ClickToCopy text={value} />}
          </span>
          {additionalInfo}
        </span>
      </>
    );
  },
);

export default React.memo(AssemblyInfo);
