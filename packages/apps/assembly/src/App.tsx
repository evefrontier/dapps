import { Outlet, useLocation } from "react-router-dom";

import "./App.css";
import "@eveworld/ui-components/styles.css";

import {
  useNotification,
  useConnection,
  useSmartObject,
  DetailedSmartCharacterResponse,
  getWalletCharacters,
  transformToCharacter,
  parseCharacterFromJson,
  CharacterInfo,
} from "@evefrontier/dapp-kit";
import {
  EveConnectWallet,
  EveFeralCodeGen,
  EveLayout,
  EveAlert,
} from "@eveworld/ui-components";

import SkeletonConnect from "./components/skeletons/SkeletonConnect";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useEffect, useState } from "react";

/**
 * Main App component that handles different rendering states based on connection and client status.
 */
const App = () => {
  const [userCharacter, setUserCharacter] = useState<CharacterInfo | null>(
    null,
  );
  const { handleConnect, handleDisconnect, walletAddress, hasEveVault } =
    useConnection();
  const { notification } = useNotification();
  const { assembly } = useSmartObject();

  const currentAccount = useCurrentAccount();
  const connected = !!currentAccount;

  // Get the character from the wallet
  useEffect(() => {
    if (connected) {
      getWalletCharacters(currentAccount?.address).then((response) => {
        const data = response.data;
        if (!data) {
          console.warn("[Dapp] No data returned from getWalletCharacters");
          return;
        }
        const json =
          data?.address?.objects?.nodes?.[0]?.contents?.extract?.asAddress
            ?.asObject?.asMoveObject?.contents?.json;
        const characterInfo = parseCharacterFromJson(json);

        if (characterInfo) {
          setUserCharacter(characterInfo);
        }
      });
    }
  }, [connected, currentAccount?.address]);

  // Check if the user is on a client route
  const isClient = useLocation().pathname.includes("client");

  /**
   * If user is on a client route AND not fully connected (missing provider, public client, or wallet client):
   *   Renders SkeletonConnect component for loading state
   *
   * @returns React.JSX.Element representing the appropriate skeleton UI for the current path
   */
  if (isClient && (!connected || !currentAccount)) {
    return (
      <SkeletonConnect
        handleConnect={handleConnect}
        hasEveVault={hasEveVault}
        path={useLocation().pathname}
      />
    );
  }

  /**
   * If user is not fully connected (missing provider, public client, or wallet client):
   *    - Renders EveConnectWallet component for wallet connection
   *    - Displays EveFeralCodeGen components at the bottom
   *
   * @returns React.JSX.Element
   */
  if (!connected) {
    return (
      <div className="h-full w-full bg-crude-60 -z-10">
        <EveConnectWallet
          handleConnect={handleConnect}
          hasEveVault={hasEveVault}
        />
        <GenerateEveFeralCodeGen style="bottom-12 text-martianred-60" />
      </div>
    );
  }

  /**
   * If fully connected:
   *    - Renders main application layout with EveLayout
   *    - Shows EveAlert for notifications
   *    - If on correct chain: renders route content via Outlet
   *    - If on wrong chain: shows ErrorNotice to switch networks
   *
   * @returns React.JSX.Element
   */

  if (assembly?.id) {
    console.log(`[Dapp] Assembly %s connected`, assembly?.id);
  } else {
    console.warn("[Dapp] No assembly ID connected");
  }

  return (
    <>
      <EveAlert
        message={notification.message}
        txHash={notification.txHash}
        severity={notification.severity}
        handleClose={notification.handleClose}
        isOpen={notification.isOpen}
      />

      <EveLayout
        connected={connected}
        handleDisconnect={() => {
          handleDisconnect();
          setUserCharacter(null);
        }}
        isClient={isClient}
        walletAddress={walletAddress || ""}
        userCharacter={userCharacter}
      >
        <Outlet context={{ userCharacter }} />
      </EveLayout>
    </>
  );
};

export default App;

const GenerateEveFeralCodeGen = ({
  style,
  count = 5,
}: {
  style?: string;
  count?: number;
}) => {
  const codes = Array.from({ length: count }, (_, i) => i);
  return (
    <div
      className={`absolute flex justify-between px-10 justify-items-center w-full text-xs ${style}`}
    >
      {codes.map((index) => (
        <EveFeralCodeGen key={index} />
      ))}{" "}
    </div>
  );
};
