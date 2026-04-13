import {
  AssemblyType,
  Assemblies,
  DetailedSmartCharacterResponse,
  State,
  CharacterInfo,
} from "@evefrontier/dapp-kit";
import React, { useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";

import { AssemblyInfo, EveContainer, Divider } from "@eveworld/ui-components";

import Actions from "../Actions";
import AssemblyIcon from "../AssemblyIcon";
import EditUnit from "../EditUnit";

const Root = React.memo(
  ({
    assembly,
    character,
  }: {
    assembly: AssemblyType<Assemblies>;
    character: DetailedSmartCharacterResponse | null;
  }): React.JSX.Element => {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const context = useOutletContext<{ userCharacter: CharacterInfo }>();

    const isOnline = assembly.state === State.ONLINE;

    const showContainer = !useLocation().pathname.includes("client");

    return (
      <EveContainer
        className="flex flex-col"
        id="smartassembly-name"
        showBorder={showContainer}
        showHeader={showContainer}
        headerText={
          assembly?.name || assembly?.typeDetails?.name || assembly.type
        }
      >
        {isEditing ? (
          <EditUnit handleClose={() => setIsEditing(false)} />
        ) : (
          <>
            <AssemblyIcon assembly={assembly} isOnline={isOnline} />
            <Actions setIsEditing={setIsEditing} isOnline={isOnline} />
            <div
              className="Border-Container text-sm !p-4"
              id="smartassembly-description"
            >
              <div>
                {assembly.description || assembly.typeDetails?.description}
              </div>

              <Divider />

              <AssemblyInfo
                assembly={assembly}
                assemblyOwner={character}
                userCharacter={context.userCharacter}
              />
            </div>
          </>
        )}
      </EveContainer>
    );
  },
);

export default React.memo(Root);
