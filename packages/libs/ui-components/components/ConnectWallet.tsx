import React from "react";
import { Logo } from "../assets";
import EveButton from "./EveButton";

const ConnectWallet = React.memo(
  ({ handleConnect }: { handleConnect: () => void }): React.JSX.Element => {
    return (
      <div className="h-screen max-w-[560px] mx-auto relative flex flex-col items-center justify-center">
        <Logo className="w-[650px] m-10" />
        <div className="grid gap-2">
          <EveButton
            onClick={() => handleConnect()}
            // disabled={!isEveVaultInjected}
            variant="primary"
          >
            Connect to EVE Vault
          </EveButton>
          {/* ) : (
            <EveButton
              variant="primary"
              onClick={() =>
                window.open(
                  "https://docs.evefrontier.com/EveVault/installation"
                )
              }
            >
              Please install EVE Vault
            </EveButton>
          )} */}

          <EveButton
            variant="ghost"
            className="text-xl"
            onClick={() =>
              window.open("https://docs.evefrontier.com/Dapp/quick-start")
            }
          >
            EVE Frontier Docs
          </EveButton>
        </div>
      </div>
    );
  },
);

export default React.memo(ConnectWallet);
