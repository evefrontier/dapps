import React, { ReactNode } from "react";
import "../styles-ui.css";
import Header from "./Header";
import {
  CharacterInfo,
  DetailedSmartCharacterResponse,
} from "@evefrontier/dapp-kit";

interface EveLayoutProps {
  children: ReactNode;
  connected: boolean;
  handleDisconnect: () => void;
  isClient?: boolean;
  walletAddress: string;
  userCharacter: CharacterInfo | null;
}

const EveLayout: React.FC<EveLayoutProps> = ({
  children,
  connected,
  handleDisconnect,
  isClient = false,
  walletAddress,
  userCharacter,
}) => {
  return (
    <div className="relative min-h-full w-full bg-crude-60">
      <div className="w-screen min-h-screen max-w-screen-lg mx-auto ">
        <div className="flex flex-col align-center mx-auto min-h-screen">
          {!isClient && (
            <Header
              connected={connected}
              handleDisconnect={handleDisconnect}
              walletAddress={walletAddress}
              userCharacter={userCharacter}
            />
          )}
          <div className="w-full flex-grow">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default EveLayout;
