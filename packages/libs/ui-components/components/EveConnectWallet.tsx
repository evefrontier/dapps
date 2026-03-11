import React from "react";

import { ConnectWallet } from "../assets";
import EveButton from "./EveButton";

/**
 * Component for connecting different supported wallets in Eve dApps.
 *
 * Checks for available wallets, displays option to connect with EVE Vault,
 * and provides links for installing EVE Vault and dApp docs.
 *
 * @returns React.JSX.Element representing the UI for connecting wallets
 */
const EveConnectWallet = React.memo(
  ({
    handleConnect,
    hasEveVault,
  }: {
    handleConnect: () => void;
    hasEveVault: boolean;
  }): React.JSX.Element => {
    return (
      <div className="h-screen max-w-[560px] mx-auto relative flex flex-col items-center justify-center">
        <div
          className="h-[280px] w-[280px] relative cursor-pointer"
          onClick={() => handleConnect()}
        >
          <ConnectWallet className="mx-auto my-auto h-full" />{" "}
          <div className="absolute w-full -bottom-4">
            <EveButton
              variant="primary"
              className="mx-auto uppercase"
              id="connect-evevault"
            >
              {hasEveVault
                ? "Connect with EVE Vault"
                : "Please install EVE Vault"}
            </EveButton>
          </div>
        </div>

        <div className="mb-10" />

        <div className="grid gap-2">
          <EveButton
            variant="tertiary"
            className="mx-auto"
            onClick={() =>
              window.open("https://docs.evefrontier.com/Dapp/quick-start")
            }
          >
            Documentation
          </EveButton>
        </div>
      </div>
    );
  },
);

export default React.memo(EveConnectWallet);
